import { AI_SERVICES } from "src/Constants";
import {
  createProviderAdapters,
  getProviderDefinition,
  getProviderDefinitions,
  getProviderUrl,
} from "./ProviderRegistry";
import { DEFAULT_SETTINGS } from "src/Models/Config";

describe("ProviderRegistry", () => {
  it("defines every supported AI service exactly once", () => {
    const definitions = getProviderDefinitions();
    const providerIds = definitions.map((provider) => provider.id);

    expect(providerIds.sort()).toEqual([...AI_SERVICES].sort());
    expect(new Set(providerIds).size).toBe(providerIds.length);
  });

  it("creates an adapter for every provider", () => {
    const adapters = createProviderAdapters();

    for (const provider of getProviderDefinitions()) {
      expect(adapters.get(provider.id)?.type).toBe(provider.id);
    }
  });

  it("resolves configured provider URLs with defaults as fallback", () => {
    const openAiProvider = getProviderDefinition("openai");

    expect(getProviderUrl({ ...DEFAULT_SETTINGS, openaiUrl: "" }, openAiProvider)).toBe(openAiProvider.defaultUrl);
    expect(getProviderUrl({ ...DEFAULT_SETTINGS, openaiUrl: "https://example.test" }, openAiProvider)).toBe(
      "https://example.test"
    );
  });

  it("derives provider frontmatter fields from settings", () => {
    const openAiProvider = getProviderDefinition("openai");
    const fields = openAiProvider.getFrontmatterFields({
      ...DEFAULT_SETTINGS,
      openaiDefaultModel: "openai@test-model",
      openaiDefaultTemperature: 0.2,
    });

    expect(fields.model).toBe("openai@test-model");
    expect(fields.temperature).toBe(0.2);
    expect(fields.max_tokens).toBe(DEFAULT_SETTINGS.openaiDefaultMaxTokens);
  });
});
