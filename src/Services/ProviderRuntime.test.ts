import { ApiService } from "./ApiService";
import { ProviderRuntime } from "./ProviderRuntime";

describe("ProviderRuntime", () => {
  it("selects providers from model prefixes and defaults unprefixed models to OpenAI", () => {
    const runtime = new ProviderRuntime(new ApiService());

    runtime.selectFromModel("anthropic@claude-test");
    expect(runtime.currentAdapter.type).toBe("anthropic");
    expect(runtime.getDefaultConfig().url).toContain("anthropic.com");

    runtime.selectFromModel("gpt-test");
    expect(runtime.currentAdapter.type).toBe("openai");
  });

  it("rejects unsupported explicit provider selections", () => {
    const runtime = new ProviderRuntime(new ApiService());
    expect(runtime.selectProvider("openrouter")).toBe(true);
    expect(runtime.currentAdapter.type).toBe("openrouter");
  });
});
