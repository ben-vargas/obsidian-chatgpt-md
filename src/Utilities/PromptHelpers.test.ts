import { prepareAiSdkPrompt } from "./PromptHelpers";

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
