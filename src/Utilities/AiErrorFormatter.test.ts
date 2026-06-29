import { formatStreamError, isRetryError } from "./AiErrorFormatter";

describe("AiErrorFormatter", () => {
  it("formats string errors", () => {
    expect(formatStreamError("boom")).toBe("Error: boom");
  });

  it("unwraps retry errors to their root cause", () => {
    const error = { name: "AI_RetryError", message: "Retry failed", cause: { message: "rate limited" } };

    expect(formatStreamError(error)).toBe("Error: rate limited");
    expect(isRetryError(error)).toBe(true);
  });

  it("includes named error types", () => {
    expect(formatStreamError({ name: "ProviderError", message: "bad request" })).toBe(
      "Error (ProviderError): bad request"
    );
  });
});
