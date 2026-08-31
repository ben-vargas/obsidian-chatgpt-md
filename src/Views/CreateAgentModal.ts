import { App, Modal, Notice, Setting } from "obsidian";
import { AgentService } from "src/Services/AgentService";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { ServiceContainer } from "src/core/ServiceContainer";
import { AGENT_WIZARD_SYSTEM_PROMPT } from "src/Constants";
import { getDefaultApiUrls } from "src/Commands/CommandUtilities";
import { AI_SERVICE_OPENAI } from "src/Constants";
import { aiProviderFromUrl } from "src/Utilities/ProviderHelpers";
import { parseAgentWizardResponse } from "src/Utilities/AgentWizardHelpers";
import { Logger } from "src/Utilities/Logger";

type WizardStep = "mode-select" | "wizard-input" | "wizard-loading" | "manual-form";

/**
 * Modal for creating a new agent with manual form or AI wizard
 */
export class CreateAgentModal extends Modal {
  private name = "";
  private model = "";
  private temperature = 0.7;
  private message = "";
  private modelInputEl?: HTMLInputElement;

  // Wizard state
  private step: WizardStep = "mode-select";
  private wizardModel = "";
  private wizardIdea = "";
  private cameFromWizard = false;

  constructor(
    app: App,
    private agentService: AgentService,
    private settings: ChatGPT_MDSettings,
    private availableModels: string[],
    private services?: ServiceContainer
  ) {
    super(app);
  }

  onOpen(): void {
    if (!this.services || this.availableModels.length === 0) {
      this.step = "manual-form";
    }
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    this.contentEl.empty();

    switch (this.step) {
      case "mode-select":
        this.renderModeSelect();
        break;
      case "wizard-input":
        this.renderWizardInput();
        break;
      case "wizard-loading":
        this.renderWizardLoading();
        break;
      case "manual-form":
        this.renderManualForm();
        break;
    }
  }

  private navigateTo(step: WizardStep): void {
    this.step = step;
    this.render();
  }

  // ── Step: Mode Selection ──────────────────────────────────

  private renderModeSelect(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Create New Agent" });

    contentEl.createEl("p", {
      text: "How would you like to create your agent?",
      cls: "chatgpt-md-mode-description",
    });

    const cardsContainer = contentEl.createDiv({ cls: "chatgpt-md-mode-cards" });

    this.createModeCard(cardsContainer, "Manual", "Configure everything yourself", () =>
      this.navigateTo("manual-form")
    );

    this.createModeCard(cardsContainer, "AI Wizard", "Describe your idea, AI creates the agent", () =>
      this.navigateTo("wizard-input")
    );
  }

  private createModeCard(container: HTMLElement, title: string, description: string, onClick: () => void): void {
    const card = container.createDiv({ cls: "chatgpt-md-mode-card" });
    card.createEl("h3", { text: title });
    card.createEl("p", { text: description });

    card.addEventListener("click", onClick);
  }

  // ── Step: Wizard Input ────────────────────────────────────

  private renderWizardInput(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "AI Agent Wizard" });

    this.addWizardModelField(contentEl);

    new Setting(contentEl).setName("Describe your agent idea").addTextArea((textarea) => {
      textarea
        .setPlaceholder(
          "e.g., A coding assistant that specializes in TypeScript and React, helps with code reviews, and suggests best practices..."
        )
        .setValue(this.wizardIdea)
        .onChange((value) => {
          this.wizardIdea = value;
        });
      textarea.inputEl.addClass("chatgpt-md-wizard-idea");
    });

    this.addWizardButtons(contentEl);
  }

  private addWizardModelField(container: HTMLElement): void {
    let suggestionsEl: HTMLElement;

    new Setting(container)
      .setName("AI Model")
      .setDesc("Select which model generates the agent")
      .addText((text) => {
        text.setPlaceholder("Type to filter models...").onChange((value) => {
          this.wizardModel = value;
          this.updateModelSuggestions(value, suggestionsEl, true);
        });
        text.inputEl.addClass("chatgpt-md-setting-input");

        if (this.wizardModel) {
          text.setValue(this.wizardModel);
        }

        this.modelInputEl = text.inputEl;
      });

    suggestionsEl = container.createDiv({ cls: "chatgpt-md-model-suggestions chatgpt-md-model-suggestions-box" });
  }

  private addWizardButtons(container: HTMLElement): void {
    const buttonContainer = container.createDiv({ cls: "chatgpt-md-modal-action-row" });

    const backBtn = buttonContainer.createEl("button", { text: "Back" });
    backBtn.onclick = () => this.navigateTo("mode-select");

    const createBtn = buttonContainer.createEl("button", {
      text: "Create with AI",
      cls: "mod-cta",
    });
    createBtn.onclick = () => this.handleWizardGenerate();
  }

  // ── Step: Wizard Loading ──────────────────────────────────

  private renderWizardLoading(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Creating your agent..." });

    const loadingContainer = contentEl.createDiv({ cls: "chatgpt-md-loading-container" });
    loadingContainer.createDiv({ cls: "chatgpt-md-spinner" });

    loadingContainer.createEl("p", {
      text: "AI is crafting your agent's configuration...",
      cls: "chatgpt-md-loading-desc",
    });
  }

  // ── Step: Manual Form ─────────────────────────────────────

  private renderManualForm(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Create New Agent" });

    this.addNameField(contentEl);
    this.addModelField(contentEl);
    this.addTemperatureField(contentEl);
    this.addMessageField(contentEl);
    this.addManualButtons(contentEl);
  }

  private addNameField(container: HTMLElement): void {
    new Setting(container).setName("Agent Name").addText((text) => {
      text
        .setPlaceholder("My Agent")
        .setValue(this.name)
        .onChange((value) => {
          this.name = value;
        });
      text.inputEl.addClass("chatgpt-md-setting-input");
    });
  }

  private addModelField(container: HTMLElement): void {
    new Setting(container).setName("Model").addText((text) => {
      text
        .setPlaceholder("Type to filter models...")
        .setValue(this.model)
        .onChange((value) => {
          this.model = value;
          this.updateModelSuggestions(value, suggestionsEl, false);
        });
      text.inputEl.addClass("chatgpt-md-setting-input");

      this.modelInputEl = text.inputEl;
    });

    const suggestionsEl = container.createDiv({
      cls: "chatgpt-md-model-suggestions chatgpt-md-model-suggestions-box",
    });

    this.updateModelSuggestions("", suggestionsEl, false);
  }

  private updateModelSuggestions(query: string, suggestionsEl: HTMLElement, isWizard: boolean): void {
    suggestionsEl.empty();

    const filtered = this.availableModels.filter((m) => m.toLowerCase().includes(query.toLowerCase()));

    for (const model of filtered) {
      const item = suggestionsEl.createDiv({ cls: "suggestion-item chatgpt-md-model-suggestion-item" });
      item.setText(model);
      item.addEventListener("click", () => {
        if (isWizard) {
          this.wizardModel = model;
        } else {
          this.model = model;
        }
        if (this.modelInputEl) {
          this.modelInputEl.value = model;
          this.modelInputEl.dispatchEvent(new Event("input"));
        }
        suggestionsEl.empty();
      });
    }
  }

  private addTemperatureField(container: HTMLElement): void {
    const tempDisplay = container.createSpan({ text: this.temperature.toFixed(1), cls: "chatgpt-md-temp-display" });

    new Setting(container).setName("Temperature").addSlider((slider) => {
      slider
        .setLimits(0, 2, 0.1)
        .setValue(this.temperature)
        .onChange((value) => {
          this.temperature = value;
          tempDisplay.setText(value.toFixed(1));
        });
      slider.sliderEl.addClass("chatgpt-md-setting-slider");
      slider.sliderEl.addEventListener("input", () => {
        tempDisplay.setText(slider.getValue().toFixed(1));
      });
    });

    const settingItem = container.lastElementChild;
    const controlEl = settingItem?.querySelector(".setting-item-control");
    if (controlEl) {
      controlEl.appendChild(tempDisplay);
    }
  }

  private addMessageField(container: HTMLElement): void {
    new Setting(container).setName("Agent Message").addTextArea((textarea) => {
      textarea
        .setPlaceholder("Enter the agent's initial prompt or instructions...")
        .setValue(this.message)
        .onChange((value) => {
          this.message = value;
        });
      textarea.inputEl.addClass("chatgpt-md-agent-message");
    });
  }

  private addManualButtons(container: HTMLElement): void {
    const buttonContainer = container.createDiv({ cls: "chatgpt-md-modal-action-row" });

    const backBtn = buttonContainer.createEl("button", { text: "Back" });
    backBtn.onclick = () => this.navigateTo(this.cameFromWizard ? "wizard-input" : "mode-select");

    const createBtn = buttonContainer.createEl("button", { text: "Create Agent", cls: "mod-cta" });
    createBtn.onclick = () => this.handleCreate();
  }

  // ── AI Generation ─────────────────────────────────────────

  private async handleWizardGenerate(): Promise<void> {
    if (!this.wizardModel.trim()) {
      new Notice("Please select a model");
      return;
    }
    if (!this.wizardIdea.trim()) {
      new Notice("Please describe your agent idea");
      return;
    }
    if (!this.services) {
      new Notice("AI services not available");
      return;
    }

    this.navigateTo("wizard-loading");

    try {
      const response = await this.callAiForAgentConfig();
      const parsed = parseAgentWizardResponse(response);

      if (!parsed) {
        new Notice("Could not parse AI response. Please try again.");
        this.navigateTo("wizard-input");
        return;
      }

      this.name = parsed.name;
      this.temperature = Math.max(0, Math.min(2, parsed.temperature));
      this.message = parsed.prompt;
      this.model = this.wizardModel;
      this.cameFromWizard = true;

      this.navigateTo("manual-form");
    } catch (error) {
      Logger.error("[ChatGPT MD] AI wizard error", { error });
      new Notice(`AI wizard error: ${error instanceof Error ? error.message : String(error)}`);
      this.navigateTo("wizard-input");
    }
  }

  private async callAiForAgentConfig(): Promise<string> {
    const services = this.services!;
    const aiService = services.aiProviderService();
    const providerType = aiProviderFromUrl(undefined, this.wizardModel) || AI_SERVICE_OPENAI;
    const apiKey = services.apiAuthService.getApiKey(this.settings, providerType);
    const urls = getDefaultApiUrls(this.settings);
    const url = urls[providerType] || "";

    const messages = [
      { role: "system", content: AGENT_WIZARD_SYSTEM_PROMPT },
      { role: "user", content: this.wizardIdea },
    ];

    const result = await aiService.callAiAPI(
      messages,
      { model: this.wizardModel, stream: false, temperature: 0.7 },
      "",
      url,
      undefined,
      false,
      apiKey,
      this.settings
    );

    return result.fullString;
  }

  // ── Agent Creation ────────────────────────────────────────

  private async handleCreate(): Promise<void> {
    if (!this.name.trim()) {
      new Notice("Please enter an agent name");
      return;
    }
    if (!this.model.trim()) {
      new Notice("Please select or enter a model");
      return;
    }

    try {
      await this.agentService.createAgentFile(this.name, this.model, this.temperature, this.message, this.settings);

      new Notice(`Agent "${this.name}" created`);
      this.close();
    } catch (error) {
      Logger.error("[ChatGPT MD] Error creating agent", { error });
      new Notice(`[ChatGPT MD] Error creating agent: ${(error as Error).message}`);
    }
  }
}
