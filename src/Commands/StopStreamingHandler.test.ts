import { jest } from "@jest/globals";
import { StopStreamingHandler } from "./StopStreamingHandler";

describe("StopStreamingHandler", () => {
  it("stops only the current request and clears it by identity", () => {
    const showWarning = jest.fn();
    const handler = new StopStreamingHandler({ notificationService: { showWarning } } as never);
    const first = { stopStreaming: jest.fn() };
    const second = { stopStreaming: jest.fn() };

    handler.setCurrentAiService(first);
    handler.clearCurrentAiService(second);
    handler.execute();
    expect(first.stopStreaming).toHaveBeenCalledTimes(1);

    handler.clearCurrentAiService(first);
    handler.execute();
    expect(showWarning).toHaveBeenCalledWith("No active streaming request to stop");
  });
});
