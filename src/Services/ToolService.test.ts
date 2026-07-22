import { jest } from "@jest/globals";
import { z } from "zod";
import { ToolApprovalGateway } from "./Tools/ToolApprovalCoordinator";
import { ToolService } from "./ToolService";

describe("ToolService", () => {
  it("keeps executors private until the user approval flow runs", () => {
    const service = createService(createApprovalGateway({ approved: true, approvalId: "approval" }));
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

  it("never executes a rejected tool call", async () => {
    const execute = jest.fn(async () => "private data");
    const service = createService(createApprovalGateway({ approved: false, approvalId: "approval" }));
    service.registerTool("test_tool", { description: "test", inputSchema: z.object({}), execute });

    const results = await service.handleToolCalls([{ toolCallId: "1", toolName: "test_tool", input: {} }]);

    expect(execute).not.toHaveBeenCalled();
    expect(results[0].result).toEqual({ error: "User declined tool execution" });
  });

  it("executes approved modified arguments", async () => {
    const execute = jest.fn(async (args: Record<string, unknown>) => args);
    const service = createService(
      createApprovalGateway({ approved: true, approvalId: "approval", modifiedArgs: { query: "approved" } })
    );
    service.registerTool("test_tool", {
      description: "test",
      inputSchema: z.object({ query: z.string() }),
      execute,
    });

    await service.handleToolCalls([{ toolCallId: "1", toolName: "test_tool", input: { query: "unapproved" } }]);

    expect(execute).toHaveBeenCalledWith({ query: "approved" }, expect.objectContaining({ toolCallId: "1" }));
  });

  it("fails closed for malformed tool calls", async () => {
    const approval = createApprovalGateway({ approved: true, approvalId: "approval" });
    const service = createService(approval);

    const results = await service.handleToolCalls([null, { toolName: "", input: {} }, { toolName: "x", input: [] }]);

    expect(approval.approveTool).not.toHaveBeenCalled();
    expect(results.every((result) => /invalid/i.test((result.result as { error: string }).error))).toBe(true);
  });

  it("only adds approved web results to model context", async () => {
    const approval = createApprovalGateway({ approved: true, approvalId: "approval" });
    approval.approveWebResults.mockImplementation(async (_query, results) => ({
      approved: true,
      approvedResults: results.slice(0, 1),
    }));
    const service = createService(approval);
    const calls = [{ toolCallId: "1", toolName: "web_search", input: { query: "privacy" } }];
    const results = [
      {
        toolCallId: "1",
        result: [
          { title: "Approved", url: "https://approved", snippet: "visible" },
          { title: "Rejected", url: "https://rejected", snippet: "private" },
        ],
      },
    ];

    const processed = await service.processToolResults(calls, results);

    expect(processed.contextMessages).toHaveLength(1);
    expect(processed.contextMessages[0].content).toContain("visible");
    expect(processed.contextMessages[0].content).not.toContain("private");
  });

  it("requests approvals sequentially", async () => {
    let activeApprovals = 0;
    let maxActiveApprovals = 0;
    const approval = createApprovalGateway({ approved: true, approvalId: "approval" });
    approval.approveTool = jest.fn(async (request) => {
      activeApprovals++;
      maxActiveApprovals = Math.max(maxActiveApprovals, activeApprovals);
      await Promise.resolve();
      activeApprovals--;
      return { approved: true, approvalId: request.toolCallId };
    });
    const service = createService(approval);
    service.registerTool("test_tool", {
      description: "test",
      inputSchema: z.object({}),
      execute: async () => "ok",
    });

    await service.handleToolCalls([
      { toolCallId: "1", toolName: "test_tool", input: {} },
      { toolCallId: "2", toolName: "test_tool", input: {} },
    ]);

    expect(maxActiveApprovals).toBe(1);
  });
});

function createApprovalGateway(decision: {
  approved: boolean;
  approvalId: string;
  modifiedArgs?: Record<string, unknown>;
}): jest.Mocked<ToolApprovalGateway> {
  return {
    approveTool: jest.fn(async () => decision),
    approveVaultResults: jest.fn(async (_query, results) => ({ approved: true, approvedResults: results })),
    approveWebResults: jest.fn(async (_query, results) => ({ approved: true, approvedResults: results })),
  };
}

function createService(approval: ToolApprovalGateway): ToolService {
  return new ToolService(
    {} as never,
    {} as never,
    { showWarning: jest.fn() } as never,
    {
      enableToolCalling: true,
      webSearchProvider: "brave",
      webSearchApiKey: "",
      webSearchApiUrl: "",
    } as never,
    undefined,
    undefined,
    approval
  );
}
