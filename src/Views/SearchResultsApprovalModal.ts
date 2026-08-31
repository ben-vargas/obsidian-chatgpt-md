import { App } from "obsidian";
import { SearchResultsApprovalDecision, VaultSearchResult } from "src/Models/Tool";
import { BaseApprovalModal } from "./BaseApprovalModal";

/**
 * Modal for approving search results before they are sent to the LLM
 */
export class SearchResultsApprovalModal extends BaseApprovalModal<SearchResultsApprovalDecision> {
  private query: string;
  private results: VaultSearchResult[];

  constructor(app: App, query: string, results: VaultSearchResult[], modelName: string = "AI") {
    super(app, modelName);
    this.query = query;
    this.results = results;
  }

  protected getModalTitle(): string {
    return "ChatGPT MD - Vault Search Results";
  }

  protected getCssClass(): string {
    return "search-results-approval-modal";
  }

  protected getDescription(): string {
    return `${this.results.length} result${this.results.length !== 1 ? "s" : ""} have been found and can be shared with '${this.modelName}'.`;
  }

  protected renderSelectionItems(container: HTMLElement): void {
    // Results label
    container.createEl("p", { text: "Select which files to share:", cls: "chatgpt-md-selection-label" });

    // Results selection container
    const resultsContainer = container.createDiv({ cls: "chatgpt-md-selection-list" });

    // Initialize all results as selected by default (if not already set)
    for (const result of this.results) {
      if (!this.selections.has(result.path)) {
        this.selections.set(result.path, true);
      }

      const currentValue = this.selections.get(result.path) || false;

      // Extract actual path from markdown link format if needed
      // Path may be formatted as "[basename](path)" or plain path
      let displayPath = result.path;
      const markdownMatch = result.path.match(/\]\((.*?)\)$/);
      if (markdownMatch) {
        displayPath = markdownMatch[1];
      }

      const resultItem = resultsContainer.createDiv({ cls: "chatgpt-md-selection-item" });

      const checkbox = resultItem.createEl("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentValue;
      checkbox.onchange = () => {
        this.selections.set(result.path, checkbox.checked);
      };

      const label = resultItem.createEl("label");

      label.createDiv({ text: result.basename, cls: "chatgpt-md-selection-name" });
      label.createDiv({ text: displayPath, cls: "chatgpt-md-selection-path" });

      label.onclick = () => {
        checkbox.checked = !checkbox.checked;
        this.selections.set(result.path, checkbox.checked);
      };
    }
  }

  protected getControlNoteText(): string {
    return "You control what data is shared. The AI will only know about files you select. Deselected files remain private.";
  }

  protected getCancelText(): string {
    return "Cancel";
  }

  protected getApproveText(): string {
    return "Approve and Continue";
  }

  protected buildApprovedResult(): SearchResultsApprovalDecision {
    const approvedResults = this.results.filter((result) => this.selections.get(result.path) === true);

    return {
      approved: true,
      approvedResults: approvedResults,
    };
  }

  protected buildCancelledResult(): SearchResultsApprovalDecision {
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
