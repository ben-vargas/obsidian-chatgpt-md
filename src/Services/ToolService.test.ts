import { jest } from "@jest/globals";
import { ToolService } from "./ToolService";

describe("ToolService AI SDK declarations", () => {
  it("keeps executors private until the user approval flow runs", () => {
    const service = new ToolService(
      {} as never,
      {} as never,
      { showWarning: jest.fn() } as never,
      {
        enableToolCalling: true,
        webSearchProvider: "brave",
        webSearchApiKey: "",
        webSearchApiUrl: "",
      } as never
    );

    const declarations = service.getToolsForRequest({
      enableToolCalling: true,
      webSearchProvider: "brave",
      webSearchApiKey: "",
      webSearchApiUrl: "",
    } as never);

    expect(declarations?.vault_search.execute).toBeUndefined();
    expect(declarations?.file_read.execute).toBeUndefined();
    expect(typeof service.getTool("vault_search")?.execute).toBe("function");
    expect(typeof service.getTool("file_read")?.execute).toBe("function");
  });
});
