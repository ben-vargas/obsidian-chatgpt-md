import { App } from "obsidian";
import { WebSearchApprovalDecision, WebSearchResult } from "src/Models/Tool";
import { BaseApprovalModal } from "./BaseApprovalModal";

/**
 * Modal for approving web search results before sharing with the LLM
 */
export class WebSearchApprovalModal extends BaseApprovalModal<WebSearchApprovalDecision> {
  private query: string;
  private results: WebSearchResult[];

  constructor(app: App, query: string, results: WebSearchResult[], modelName: string = "AI") {
    super(app, modelName);
    this.query = query;
    this.results = results;
    // Initialize all results as selected
    for (const result of results) {
      this.selections.set(result.url, true);
    }
  }

  protected getModalTitle(): string {
    return "ChatGPT MD - Web Search Results";
  }

  protected getCssClass(): string {
    return "websearch-approval-modal";
  }

  protected getDescription(): string {
    return `${this.results.length} result${this.results.length !== 1 ? "s" : ""} have been found and can be shared with '${this.modelName}'.`;
  }

  protected renderSelectionItems(container: HTMLElement): void {
    container.createEl("p", {
      text: "Select which results to share:",
      cls: "chatgpt-md-selection-label",
    });
    const resultsContainer = container.createDiv({ cls: "chatgpt-md-selection-list" });
    this.results.forEach((result) => this.renderResultItem(resultsContainer, result));
  }

  private renderResultItem(container: HTMLElement, result: WebSearchResult): void {
    const resultItem = container.createDiv({ cls: "chatgpt-md-selection-item" });
    const checkbox = resultItem.createEl("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.selections.get(result.url) ?? true;
    checkbox.onchange = () => this.selections.set(result.url, checkbox.checked);

    const label = resultItem.createEl("label", { cls: "chatgpt-md-selection-content" });
    label.createDiv({ text: result.title, cls: "chatgpt-md-selection-title" });
    const url = label.createEl("a", {
      text: result.url,
      href: result.url,
      cls: "chatgpt-md-selection-url",
    });
    url.setAttr("target", "_blank");

    if (result.snippet) {
      label.createDiv({
        text: result.snippet.substring(0, 150) + (result.snippet.length > 150 ? "..." : ""),
        cls: "chatgpt-md-selection-snippet",
      });
    }

    label.onclick = () => {
      checkbox.checked = !checkbox.checked;
      this.selections.set(result.url, checkbox.checked);
    };
  }

  protected getControlNoteText(): string {
    return "You control what data is shared. Only selected results will be visible to the AI. Deselected results remain private.";
  }

  protected getCancelText(): string {
    return "Cancel";
  }

  protected getApproveText(): string {
    return "Share Selected Results";
  }

  protected buildApprovedResult(): WebSearchApprovalDecision {
    const approvedResults = this.results.filter((r) => this.selections.get(r.url) === true);
    return {
      approved: true,
      approvedResults: approvedResults,
    };
  }

  protected buildCancelledResult(): WebSearchApprovalDecision {
    return {
      approved: false,
      approvedResults: [],
    };
  }

  protected refreshSelectionItems(): void {
    // Re-render the modal
    const { contentEl } = this;
    contentEl.empty();
    this.onOpen();
  }
}
