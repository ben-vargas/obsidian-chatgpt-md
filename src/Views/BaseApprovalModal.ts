import { App, Modal } from "obsidian";

/**
 * Generic base class for approval modals
 * Handles promise management, UI rendering, and button handling
 * Uses Template Method pattern for customization
 */
export abstract class BaseApprovalModal<TDecision> extends Modal {
  // Generic promise management
  protected result: TDecision | null = null;
  protected modalPromise: Promise<TDecision>;
  protected resolveModalPromise: (value: TDecision) => void;
  protected selections: Map<string, boolean> = new Map();
  protected modelName: string;

  constructor(app: App, modelName: string = "AI") {
    super(app);
    this.modelName = modelName;
    this.modalPromise = new Promise((resolve) => {
      this.resolveModalPromise = resolve;
    });
  }

  /**
   * Abstract methods for subclasses to implement
   */
  protected abstract getModalTitle(): string;
  protected abstract getCssClass(): string;
  protected abstract getDescription(): string;
  protected abstract renderSelectionItems(container: HTMLElement): void;
  protected abstract getControlNoteText(): string;
  protected abstract getCancelText(): string;
  protected abstract getApproveText(): string;
  protected abstract buildApprovedResult(): TDecision;
  protected abstract buildCancelledResult(): TDecision;

  /**
   * Template method - defines the modal structure
   */
  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass(this.getCssClass());

    this.renderHeader(contentEl);
    this.renderDescription(contentEl);
    this.renderSelectionItems(contentEl);
    this.renderSelectAllButtons(contentEl);
    this.renderControlNote(contentEl);
    this.renderActionButtons(contentEl);
  }

  /**
   * Render modal header with title
   */
  protected renderHeader(container: HTMLElement): void {
    container.createEl("h2", { text: this.getModalTitle(), cls: "chatgpt-md-modal-header" });
  }

  /**
   * Render description text
   */
  protected renderDescription(container: HTMLElement): void {
    container.createEl("p", { text: this.getDescription(), cls: "chatgpt-md-modal-description" });
  }

  /**
   * Render select/deselect all buttons
   */
  protected renderSelectAllButtons(container: HTMLElement): void {
    const buttonRow = container.createDiv({ cls: "chatgpt-md-modal-button-row" });

    const selectAllBtn = buttonRow.createEl("button", {
      text: "Select All",
      cls: "chatgpt-md-modal-btn-secondary chatgpt-md-modal-btn-equal",
    });
    selectAllBtn.onclick = () => {
      this.setAllSelections(true);
      this.refreshSelectionItems();
    };

    const deselectAllBtn = buttonRow.createEl("button", {
      text: "Deselect All",
      cls: "chatgpt-md-modal-btn-secondary chatgpt-md-modal-btn-equal",
    });
    deselectAllBtn.onclick = () => {
      this.setAllSelections(false);
      this.refreshSelectionItems();
    };
  }

  /**
   * Set all selections to the same value
   */
  protected setAllSelections(value: boolean): void {
    for (const key of this.selections.keys()) {
      this.selections.set(key, value);
    }
  }

  /**
   * Refresh selection items (to be called after select/deselect all)
   * Subclasses can override for custom refresh behavior
   */
  protected refreshSelectionItems(): void {
    // Default implementation - re-render the entire modal
    this.close();
    // Subclasses should override to update UI without closing
  }

  /**
   * Render control note with styling
   */
  protected renderControlNote(container: HTMLElement): void {
    container.createDiv({ text: this.getControlNoteText(), cls: "chatgpt-md-modal-note" });
  }

  /**
   * Render action buttons (cancel and approve)
   */
  protected renderActionButtons(container: HTMLElement): void {
    const buttonContainer = container.createDiv({ cls: "chatgpt-md-modal-action-row" });

    const cancelBtn = buttonContainer.createEl("button", { text: this.getCancelText() });
    this.styleCancelButton(cancelBtn);
    cancelBtn.onclick = () => {
      this.result = this.buildCancelledResult();
      this.resolveModalPromise(this.result);
      this.close();
    };

    const approveBtn = buttonContainer.createEl("button", { text: this.getApproveText() });
    this.styleApproveButton(approveBtn);
    approveBtn.onclick = () => {
      this.result = this.buildApprovedResult();
      this.resolveModalPromise(this.result);
      this.close();
    };
  }

  /**
   * Style a secondary button (select all, deselect all)
   */
  protected styleSecondaryButton(button: HTMLButtonElement): void {
    button.addClass("chatgpt-md-modal-btn-secondary");
  }

  /**
   * Style cancel button
   */
  protected styleCancelButton(button: HTMLButtonElement): void {
    button.addClass("chatgpt-md-modal-btn-secondary");
  }

  /**
   * Style approve button
   */
  protected styleApproveButton(button: HTMLButtonElement): void {
    button.addClass("chatgpt-md-modal-btn-approve");
  }

  /**
   * Wait for user decision
   */
  waitForResult(): Promise<TDecision> {
    return this.modalPromise;
  }

  /**
   * Clean up when modal closes
   */
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();

    if (!this.result) {
      this.resolveModalPromise(this.buildCancelledResult());
    }
  }
}
