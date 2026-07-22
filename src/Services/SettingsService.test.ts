import { jest } from "@jest/globals";
import { SettingsService } from "./SettingsService";

describe("SettingsService effective frontmatter", () => {
  function createService(note: Record<string, unknown>, agent: Record<string, unknown> = {}) {
    const plugin = { loadData: jest.fn(), saveData: jest.fn(), addSettingTab: jest.fn(), app: {} };
    const frontmatterManager = { readFrontmatter: jest.fn(() => note) };
    const agentService = {
      resolveAgentByName: jest.fn(async () =>
        Object.keys(agent).length ? { frontmatter: agent, body: "Agent body" } : null
      ),
    };
    const notificationService = { showError: jest.fn() };
    const service = new SettingsService(
      plugin as never,
      frontmatterManager as never,
      agentService as never,
      notificationService as never
    );
    return { service, plugin, agentService };
  }

  it("resolves note values over agent, global, and template values", async () => {
    const { service } = createService(
      { agent: "Reviewer", model: "openrouter@test/model", temperature: 0.2 },
      { model: "anthropic@agent-model", temperature: 0.5 }
    );
    service.updateSettings({
      openrouterUrl: "https://openrouter.example",
      defaultChatFrontmatter: "---\nmodel: openai@template\ntemperature: 0.9\n---",
    });

    const config = await service.getFrontmatter({ file: {} } as never);

    expect(config.aiService).toBe("openrouter");
    expect(config.model).toBe("openrouter@test/model");
    expect(config.temperature).toBe(0.2);
    expect(config.url).toBe("https://openrouter.example");
    expect(config._agentSystemMessage).toBe("Agent body");
  });

  it("maps selected provider settings into generic request fields", async () => {
    const { service } = createService({ model: "anthropic@note-model" });
    service.updateSettings({
      anthropicDefaultTemperature: 0.4,
      anthropicDefaultMaxTokens: 2048,
    });

    const config = await service.getFrontmatter({ file: {} } as never);

    expect(config.temperature).toBe(0.4);
    expect(config.max_tokens).toBe(2048);
    expect(config.model).toBe("anthropic@note-model");
  });

  it("gives a generic note URL precedence over provider settings", async () => {
    const { service } = createService({ model: "openai@gpt-test", url: "https://compatible.example/v1" });
    service.updateSettings({ openaiUrl: "https://global.example" });

    const config = await service.getFrontmatter({ file: {} } as never);

    expect(config.url).toBe("https://compatible.example/v1");
  });

  it("loads persisted values once when explicitly requested", async () => {
    const { service, plugin } = createService({});
    plugin.loadData.mockResolvedValue({ debugMode: true, headingLevel: 4 });

    const settings = await service.loadSettings();

    expect(plugin.loadData).toHaveBeenCalledTimes(1);
    expect(settings).toMatchObject({ debugMode: true, headingLevel: 4 });
  });
});
