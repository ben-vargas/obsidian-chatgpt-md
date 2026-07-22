import { getGenerationOptions } from "./AiRequestOptions";

describe("getGenerationOptions", () => {
  it("maps persisted frontmatter names to AI SDK 7 option names", () => {
    expect(
      getGenerationOptions({
        temperature: 0,
        max_tokens: 1234,
        top_p: 0.8,
        presence_penalty: -0.2,
        frequency_penalty: 0.4,
      })
    ).toEqual({
      temperature: 0,
      maxOutputTokens: 1234,
      topP: 0.8,
      presencePenalty: -0.2,
      frequencyPenalty: 0.4,
    });
  });

  it("supports internal camelCase values and prefers explicit frontmatter values", () => {
    expect(
      getGenerationOptions({
        maxTokens: 400,
        max_tokens: 800,
        topP: 1,
        top_p: 0.5,
        presencePenalty: 0,
        frequencyPenalty: 0,
      })
    ).toMatchObject({ maxOutputTokens: 800, topP: 0.5, presencePenalty: 0, frequencyPenalty: 0 });
  });

  it("drops non-finite and non-numeric values", () => {
    expect(getGenerationOptions({ temperature: Number.NaN, max_tokens: "400" })).toEqual({
      temperature: undefined,
      maxOutputTokens: undefined,
      topP: undefined,
      presencePenalty: undefined,
      frequencyPenalty: undefined,
    });
  });
});
