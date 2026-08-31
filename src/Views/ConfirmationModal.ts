import { App, ButtonComponent, Modal } from "obsidian";

interface ConfirmationModalOptions {
  title: string;
  body: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
}

/** Small confirmation dialog replacing window.confirm, which is discouraged in Obsidian. */
export class ConfirmationModal extends Modal {
  constructor(
    app: App,
    private readonly options: ConfirmationModalOptions
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.options.title);
    this.contentEl.createEl("p", { text: this.options.body, cls: "chatgpt-md-confirmation-body" });

    const buttons = this.contentEl.createDiv({ cls: "chatgpt-md-confirmation-buttons" });
    new ButtonComponent(buttons).setButtonText("Cancel").onClick(() => this.close());
    new ButtonComponent(buttons)
      .setButtonText(this.options.confirmText)
      .setCta()
      .onClick(() => {
        this.close();
        void this.options.onConfirm();
      });
  }
}
