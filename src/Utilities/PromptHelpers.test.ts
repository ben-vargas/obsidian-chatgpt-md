import { MergedFrontmatterConfig } from "src/Models/Config";
import { buildChatSystemMessages, prepareAiSdkPrompt } from "./PromptHelpers";

describe("buildChatSystemMessages", () => {
  it("includes the plugin setting before agent and frontmatter instructions", () => {
    const frontmatter = {
      _agentSystemMessage: "Agent instructions",
      system_commands: ["Frontmatter instructions"],
    } as unknown as MergedFrontmatterConfig;

    expect(buildChatSystemMessages("Plugin instructions", frontmatter)).toEqual([
      { role: "system", content: "Plugin instructions" },
      { role: "system", content: "Agent instructions" },
      { role: "system", content: "Frontmatter instructions" },
    ]);
  });

  it("ignores empty and invalid instructions", () => {
    const frontmatter = {
      _agentSystemMessage: "  ",
      system_commands: ["", 42, "Frontmatter instructions"],
    } as unknown as MergedFrontmatterConfig;

    expect(buildChatSystemMessages(" ", frontmatter)).toEqual([
      { role: "system", content: "Frontmatter instructions" },
    ]);
  });
});

describe("prepareAiSdkPrompt", () => {
  it("moves system and developer messages into instructions", () => {
    expect(
      prepareAiSdkPrompt([
        { role: "system", content: "Plugin instructions" },
        { role: "developer", content: "Agent instructions" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ])
    ).toEqual({
      instructions: "Plugin instructions\n\nAgent instructions",
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ],
    });
  });

  it("omits instructions when there are no non-empty instruction messages", () => {
    expect(
      prepareAiSdkPrompt([
        { role: "system", content: "   " },
        { role: "user", content: "Hello" },
      ])
    ).toEqual({ messages: [{ role: "user", content: "Hello" }] });
  });
});
