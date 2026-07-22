import { jest } from "@jest/globals";
import { SettingsService } from "./SettingsService";
import { ApiAuthService } from "./ApiAuthService";
import { getCredentialDefinitions } from "./Providers/ProviderRegistry";

class FakeSecretComponent {
  constructor(_app: never, _container: never) {}
}

describe("SettingsService effective frontmatter", () => {
  function createService(
    note: Record<string, unknown>,
    agent: Record<string, unknown> = {},
    apiAuthService?: ApiAuthService
  ) {
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
      notificationService as never,
      apiAuthService
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

  it("migrates and persists categories independently without changing unrelated settings", async () => {
    const secrets = new Map<string, string>();
    const storage = {
      setSecret: jest.fn((id: string, value: string) => secrets.set(id, value)),
      getSecret: jest.fn((id: string) => secrets.get(id) ?? null),
      listSecrets: jest.fn(() => [...secrets.keys()]),
    };
    const auth = new ApiAuthService({ secretStorage: storage }, FakeSecretComponent);
    const { service, plugin } = createService({}, {}, auth);
    service.updateSettings({ apiKey: "synthetic-key", headingLevel: 4 });

    await service.migrateCredentials();

    expect(service.getSettings()).toMatchObject({ apiKey: "", headingLevel: 4 });
    expect(service.getSettings().apiKeySecretId).toBe("chatgpt-md-openai-api-key");
    expect(plugin.saveData).toHaveBeenCalledTimes(1);
    expect(plugin.saveData.mock.calls[0][0]).not.toHaveProperty("apiKey");
    expect(plugin.saveData.mock.calls[0][0]).toHaveProperty("apiKeySecretId", "chatgpt-md-openai-api-key");
  });

  it("retains plaintext when explicit insecure-copy deletion cannot be saved", async () => {
    const definition = getCredentialDefinitions()[0];
    const storage = {
      setSecret: jest.fn(),
      getSecret: jest.fn(() => "secure-value"),
      listSecrets: jest.fn(() => ["selected"]),
    };
    const auth = new ApiAuthService({ secretStorage: storage }, FakeSecretComponent);
    const { service, plugin } = createService({}, {}, auth);
    service.updateSettings({ apiKey: "insecure-copy", apiKeySecretId: "selected" });
    plugin.saveData.mockRejectedValueOnce(new Error("save failed"));

    await expect(service.deleteInsecureCredentialCopy(definition)).rejects.toThrow("save failed");
    expect(service.getSettings().apiKey).toBe("insecure-copy");
  });

  it("does not retry migration after eligible plaintext has been migrated", async () => {
    const storage = {
      setSecret: jest.fn(),
      getSecret: jest.fn((id: string) => (id === "chatgpt-md-openai-api-key" ? "secure-value" : null)),
      listSecrets: jest.fn(() => []),
    };
    const auth = new ApiAuthService({ secretStorage: storage }, FakeSecretComponent);
    const { service, plugin } = createService({}, {}, auth);
    service.updateSettings({ apiKey: "synthetic-key" });

    await service.retryCredentialMigration();
    await service.retryCredentialMigration();

    expect(plugin.saveData).toHaveBeenCalledTimes(1);
  });

  it("loads persisted values once when explicitly requested", async () => {
    const { service, plugin } = createService({});
    plugin.loadData.mockResolvedValue({ debugMode: true, headingLevel: 4 });

    const settings = await service.loadSettings();

    expect(plugin.loadData).toHaveBeenCalledTimes(1);
    expect(settings).toMatchObject({ debugMode: true, headingLevel: 4 });
  });
});
