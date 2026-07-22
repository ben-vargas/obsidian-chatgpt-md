import { jest } from "@jest/globals";
import { Logger } from "./Logger";

describe("Logger", () => {
  afterEach(() => {
    Logger.setDebugEnabled(false);
    jest.restoreAllMocks();
  });

  it("gates debug output", () => {
    const debug = jest.spyOn(console, "debug").mockImplementation(() => undefined);
    Logger.debug("hidden");
    expect(debug).not.toHaveBeenCalled();

    Logger.setDebugEnabled(true);
    Logger.debug("shown");
    expect(debug).toHaveBeenCalledWith("shown");
  });

  it("redacts credentials embedded in URLs and authorization strings", () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    Logger.error("failed", {
      error: new Error("GET https://example.test/models?key=secret failed with Bearer token-value"),
    });

    expect(error).toHaveBeenCalledWith("failed", {
      error: {
        name: "Error",
        message: "GET https://example.test/models?key=[REDACTED] failed with Bearer [REDACTED]",
      },
    });
  });

  it("redacts credential-shaped fields recursively", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    Logger.warn("request failed", {
      apiKey: "secret",
      nested: { Authorization: "Bearer secret", model: "gpt" },
    });

    expect(warn).toHaveBeenCalledWith("request failed", {
      apiKey: "[REDACTED]",
      nested: { Authorization: "[REDACTED]", model: "gpt" },
    });
  });
});
