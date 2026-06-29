import { jest } from "@jest/globals";
import { LmStudioAdapter } from "./LmStudioAdapter";
import { OllamaAdapter } from "./OllamaAdapter";

describe.each([
  ["Ollama", new OllamaAdapter(), "http://localhost:11434"],
  ["LM Studio", new LmStudioAdapter(), "http://localhost:1234"],
])("%s model discovery", (_name, adapter, url) => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("quietly returns no models when the optional local server is not running", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const makeGetRequest = jest.fn<() => Promise<never>>().mockRejectedValue(new Error("net::ERR_CONNECTION_REFUSED"));

    await expect(adapter.fetchModels(url, undefined, undefined, makeGetRequest)).resolves.toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("still reports unexpected model discovery failures", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("Invalid model response");
    const makeGetRequest = jest.fn<() => Promise<never>>().mockRejectedValue(error);

    await expect(adapter.fetchModels(url, undefined, undefined, makeGetRequest)).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("Error fetching"), error);
  });
});
