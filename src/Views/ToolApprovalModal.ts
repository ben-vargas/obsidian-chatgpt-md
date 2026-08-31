import { App } from "obsidian";
import { ToolApprovalDecision } from "src/Models/Tool";
import { BaseApprovalModal } from "./BaseApprovalModal";

/**
 * Modal for approving AI tool calls
 */
export class ToolApprovalModal extends BaseApprovalModal<ToolApprovalDecision> {
  private toolName: string;
  private args: Record<string, unknown>;
  private editedQuery: string | null = null;
  private queryTextarea: HTMLTextAreaElement | null = null;
  private approveBtn: HTMLButtonElement | null = null;

  constructor(app: App, toolName: string, args: Record<string, unknown>, modelName: string = "AI") {
    super(app, modelName);
    this.toolName = toolName;
    this.args = args;
  }

  protected getModalTitle(): string {
    const displayNames: Record<string, string> = {
      vault_search: "ChatGPT MD - Vault Search",
      file_read: "ChatGPT MD - File Read",
      web_search: "ChatGPT MD - Web Search",
    };
    return displayNames[this.toolName] || this.toolName;
  }

  protected getCssClass(): string {
    return "tool-approval-modal";
  }

  protected getDescription(): string {
    // Description is rendered separately in renderRequestDescription
    return "";
  }

  protected renderSelectionItems(container: HTMLElement): void {
    // First render the request description
    this.renderRequestDescription(container);

    // File selection for file_read tool
    if (this.toolName === "file_read" && this.args && Array.isArray(this.args.filePaths)) {
      this.renderFileSelection(container, this.args.filePaths);
    }
  }

  /**
   * Render file selection UI for file_read tool
   */
  private renderFileSelection(container: HTMLElement, filePaths: string[]): void {
    const fileSelectionLabel = container.createEl("p", { text: "Select files to share:" });
    fileSelectionLabel.style.marginTop = "16px";
    fileSelectionLabel.style.marginBottom = "8px";
    fileSelectionLabel.style.fontWeight = "500";
    fileSelectionLabel.style.opacity = "0.7";

    const fileListContainer = container.createDiv();
    fileListContainer.style.marginBottom = "12px";

    // Initialize all files as selected by default (if not already set)
    for (const path of filePaths) {
      // Only set to true if not already in the map (preserve user selections)
      if (!this.selections.has(path)) {
        this.selections.set(path, true);
      }

      const fileName = path.split("/").pop() || path;
      const currentValue = this.selections.get(path) || false;

      const fileItem = fileListContainer.createDiv();
      fileItem.style.display = "flex";
      fileItem.style.alignItems = "center";
      fileItem.style.padding = "8px";
      fileItem.style.marginBottom = "4px";
      fileItem.style.borderRadius = "4px";
      fileItem.style.backgroundColor = "var(--background-secondary)";

      const checkbox = fileItem.createEl("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentValue;
      checkbox.style.marginRight = "8px";
      checkbox.onchange = () => {
        this.selections.set(path, checkbox.checked);
      };

      const label = fileItem.createEl("label");
      label.style.flex = "1";
      label.style.cursor = "pointer";

      const nameEl = label.createDiv({ text: fileName });
      nameEl.style.fontWeight = "500";
      nameEl.style.fontSize = "0.95em";

      const pathEl = label.createDiv({ text: path });
      pathEl.style.fontSize = "0.85em";
      pathEl.style.opacity = "0.6";
      pathEl.style.marginTop = "2px";

      label.onclick = () => {
        checkbox.checked = !checkbox.checked;
        this.selections.set(path, checkbox.checked);
      };
    }
  }

  protected getControlNoteText(): string {
    // For search tools, explain there will be another approval for results
    if (this.toolName === "vault_search" || this.toolName === "web_search") {
      return "After the search completes, you'll review and approve the results before they're shared with the AI.";
    }
    // Override renderControlNote to not show it for file_read
    return "";
  }

  protected override renderControlNote(container: HTMLElement): void {
    if (this.toolName === "vault_search" || this.toolName === "web_search") {
      super.renderControlNote(container);
    }
    // No control note for file_read tool
  }

  protected getCancelText(): string {
    return "Cancel";
  }

  protected getApproveText(): string {
    return "Approve and Execute";
  }

  protected override renderActionButtons(container: HTMLElement): void {
    const buttonContainer = container.createDiv();
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "8px";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.marginTop = "20px";

    const cancelBtn = buttonContainer.createEl("button", { text: this.getCancelText() });
    this.styleCancelButton(cancelBtn);
    cancelBtn.onclick = () => {
      this.result = this.buildCancelledResult();
      this.resolveModalPromise(this.result);
      this.close();
    };

    this.approveBtn = buttonContainer.createEl("button", { text: this.getApproveText() });
    this.styleApproveButton(this.approveBtn);

    // Initial validation
    this.validateApproveButton();

    this.approveBtn.onclick = () => {
      this.result = this.buildApprovedResult();
      this.resolveModalPromise(this.result);
      this.close();
    };
  }

  protected buildApprovedResult(): ToolApprovalDecision {
    return {
      approvalId: this.toolName,
      approved: true,
      modifiedArgs: this.getModifiedArgs(),
    };
  }

  protected buildCancelledResult(): ToolApprovalDecision {
    return {
      approvalId: this.toolName,
      approved: false,
    };
  }

  /**
   * Validate query and enable/disable approve button
   */
  private validateApproveButton(): void {
    if (!this.approveBtn) return;

    // For search tools, require non-empty query
    if ((this.toolName === "vault_search" || this.toolName === "web_search") && this.queryTextarea) {
      const query = this.queryTextarea.value.trim();
      const isValid = query.length > 0;
      this.approveBtn.disabled = !isValid;
      this.approveBtn.style.opacity = isValid ? "1" : "0.5";
      this.approveBtn.style.cursor = isValid ? "pointer" : "not-allowed";
    } else {
      // Other tools - always enabled
      this.approveBtn.disabled = false;
      this.approveBtn.style.opacity = "1";
      this.approveBtn.style.cursor = "pointer";
    }
  }

  /**
   * Get modified arguments based on user selections
   */
  private getModifiedArgs(): Record<string, unknown> {
    // Default to empty object if args undefined
    const baseArgs = this.args || {};

    // For file_read, filter to only selected files
    if (this.toolName === "file_read" && baseArgs.filePaths) {
      const selectedFiles = Array.from(this.selections.entries())
        .filter(([_, selected]) => selected)
        .map(([path, _]) => path);

      return {
        ...baseArgs,
        filePaths: selectedFiles,
      };
    }

    // For vault_search and web_search, include edited query if changed
    if ((this.toolName === "vault_search" || this.toolName === "web_search") && this.editedQuery) {
      return {
        ...baseArgs,
        query: this.editedQuery,
      };
    }

    return baseArgs;
  }

  /**
   * Render the request description with query in list format for search tools
   */
  private renderRequestDescription(container: HTMLElement): void {
    const query = typeof this.args.query === "string" ? this.args.query : "";
    const files = Array.isArray(this.args.filePaths) ? this.args.filePaths : [];
    const intro = container.createEl("p", { cls: "chatgpt-md-tool-request-intro" });
    intro.appendChild(document.createTextNode(`'${this.modelName}'${this.getRequestAction(files.length)}`));

    if ((this.toolName === "vault_search" || this.toolName === "web_search") && query) {
      this.renderQueryEditor(container, query);
      return;
    }

    const note = this.toolName === "file_read" ? "You can select which files to share on the next screen." : "";
    container.createEl("p", { text: note, cls: "chatgpt-md-tool-request-note" });
  }

  private getRequestAction(fileCount: number): string {
    if (this.toolName === "vault_search") return " requests to search your vault for:";
    if (this.toolName === "web_search") return " requests to search the web for:";
    if (this.toolName === "file_read") {
      return ` requests to read ${fileCount} file${fileCount === 1 ? "" : "s"}:`;
    }
    return " requests to use a tool.";
  }

  private renderQueryEditor(container: HTMLElement, query: string): void {
    container.createEl("label", {
      text: "Search query:",
      cls: "chatgpt-md-tool-query-label",
    });
    this.queryTextarea = container.createEl("textarea", { cls: "chatgpt-md-tool-query" });
    this.queryTextarea.value = query;
    this.queryTextarea.addEventListener("input", () => {
      this.editedQuery = this.queryTextarea?.value.trim() || "";
      this.validateApproveButton();
    });
  }

  protected refreshSelectionItems(): void {
    // Re-render the modal
    const { contentEl } = this;
    contentEl.empty();
    this.onOpen();
  }
}
