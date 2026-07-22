import { jest } from "@jest/globals";
import { requestStreamFetch } from "./requestStream";

describe("requestStreamFetch", () => {
  afterEach(() => jest.restoreAllMocks());

  it("forwards method, body, headers, and signal", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(response);
    const controller = new AbortController();

    await expect(
      requestStreamFetch({
        url: "https://example.com/test",
        method: "POST",
        body: "payload",
        headers: { Authorization: "Bearer test" },
        signal: controller.signal,
      })
    ).resolves.toBe(response);

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/test", {
      method: "POST",
      body: "payload",
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
      signal: controller.signal,
    });
  });

  it("does not duplicate an existing content-type header", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    await requestStreamFetch({ url: "https://example.com", headers: { "content-type": "text/plain" } });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ headers: { "content-type": "text/plain" } })
    );
  });
});
