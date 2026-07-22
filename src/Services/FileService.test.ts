import { FileService } from "./FileService";

describe("FileService.formatDate", () => {
  it("applies the configured date tokens", () => {
    const service = new FileService({} as never, {} as never);
    const date = new Date(2025, 0, 2, 3, 4, 5);

    expect(service.formatDate(date, "YYYYMMDDhhmmss")).toBe("20250102030405");
    expect(service.formatDate(date, "YYYY-MM-DD_hh-mm-ss")).toBe("2025-01-02_03-04-05");
  });

  it("preserves literal text", () => {
    const service = new FileService({} as never, {} as never);
    expect(service.formatDate(new Date(2025, 9, 12, 0, 0, 0), "Chat-YYYY-MM-DD")).toBe("Chat-2025-10-12");
  });
});
