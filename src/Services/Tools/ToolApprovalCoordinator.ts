import { App } from "obsidian";
import {
  SearchResultsApprovalDecision,
  ToolApprovalDecision,
  ToolApprovalRequest,
  VaultSearchResult,
  WebSearchApprovalDecision,
  WebSearchResult,
} from "src/Models/Tool";
import { SearchResultsApprovalModal } from "src/Views/SearchResultsApprovalModal";
import { ToolApprovalModal } from "src/Views/ToolApprovalModal";
import { WebSearchApprovalModal } from "src/Views/WebSearchApprovalModal";

export interface ToolApprovalGateway {
  approveTool(request: ToolApprovalRequest): Promise<ToolApprovalDecision>;
  approveVaultResults(
    query: string,
    results: VaultSearchResult[],
    modelName?: string
  ): Promise<SearchResultsApprovalDecision>;
  approveWebResults(query: string, results: WebSearchResult[], modelName?: string): Promise<WebSearchApprovalDecision>;
}

export class ToolApprovalCoordinator implements ToolApprovalGateway {
  constructor(private readonly app: App) {}

  async approveTool(request: ToolApprovalRequest): Promise<ToolApprovalDecision> {
    const modal = new ToolApprovalModal(this.app, request.toolName, request.args, request.modelName);
    modal.open();
    return modal.waitForResult();
  }

  async approveVaultResults(
    query: string,
    results: VaultSearchResult[],
    modelName?: string
  ): Promise<SearchResultsApprovalDecision> {
    const modal = new SearchResultsApprovalModal(this.app, query, results, modelName);
    modal.open();
    return modal.waitForResult();
  }

  async approveWebResults(
    query: string,
    results: WebSearchResult[],
    modelName?: string
  ): Promise<WebSearchApprovalDecision> {
    const modal = new WebSearchApprovalModal(this.app, query, results, modelName);
    modal.open();
    return modal.waitForResult();
  }
}
