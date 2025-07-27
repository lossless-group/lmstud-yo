import { App, Modal, Notice, Setting } from 'obsidian';
import { LMStudioService } from '../services/LMStudioService';
import { LMStudioSettings } from '../settings/LMStudioSettings';

interface LMStudioPluginSettings {
    lmstudio: LMStudioSettings;
}

export class LMStudioModal extends Modal {
    private service: LMStudioService;
    private isProcessing = false;
    private selectedModel: string = '';
    private availableModels: string[] = [];
    // Settings is used in the constructor to initialize the service and selectedModel
    private settings: LMStudioPluginSettings;

    constructor(
        app: App,
        settings: LMStudioPluginSettings,
        private onQuery: (query: string, model: string) => Promise<string>
    ) {
        super(app);
        this.settings = settings;
        this.service = new LMStudioService(settings.lmstudio);
        this.selectedModel = settings.lmstudio.defaultModel;
        this.modalEl.addClass('lmstudio-query-modal');
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        contentEl.createEl('h2', { text: 'LM Studio Query' });

        // Query input
        const queryContainer = contentEl.createDiv('lmstudio-query-container');
        
        // Response area
        const responseContainer = contentEl.createDiv('lmstudio-response-container');
        responseContainer.createEl('h3', { text: 'Response' });
        const responseEl = responseContainer.createDiv('lmstudio-response');
        
        // Model selection
        new Setting(queryContainer)
            .setName('Model')
            .addDropdown(dropdown => {
                this.availableModels.forEach(model => {
                    dropdown.addOption(model, model);
                });
                dropdown
                    .setValue(this.selectedModel)
                    .onChange(value => {
                        this.selectedModel = value;
                    });
            });

        // Query input
        const queryInput = queryContainer.createEl('textarea', {
            placeholder: 'Enter your query...',
            cls: 'lmstudio-query-input'
        });
        
        // Submit button
        const submitButton = queryContainer.createEl('button', {
            text: 'Submit Query',
            cls: 'lmstudio-submit-button'
        });

        // Handle query submission
        const submitQuery = async () => {
            const query = queryInput.value.trim();
            if (!query || this.isProcessing) return;

            this.isProcessing = true;
            submitButton.setAttribute('disabled', 'true');
            submitButton.textContent = 'Processing...';
            responseEl.textContent = '';
            
            try {
                // Get response from LM Studio
                const response = await this.onQuery(query, this.selectedModel);
                responseEl.textContent = response;
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('Query failed:', error);
                new Notice(`Error: ${errorMessage}`);
                responseEl.textContent = `Error: ${errorMessage}`;
            } finally {
                this.isProcessing = false;
                submitButton.removeAttribute('disabled');
                submitButton.textContent = 'Submit Query';
            }
        };

        // Event listeners
        submitButton.addEventListener('click', submitQuery);
        queryInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                submitQuery();
            }
        });

        // Load available models
        this.loadModels().catch(error => {
            console.error('Failed to load models:', error);
            new Notice('Failed to load models. Check console for details.');
        });
    }

    private async loadModels() {
        try {
            this.availableModels = await this.service.getModels();
            if (this.availableModels.length > 0) {
                // Ensure we always have a valid selected model
                if (!this.selectedModel || !this.availableModels.includes(this.selectedModel)) {
                    this.selectedModel = this.availableModels[0] || '';
                }
                
                // Update the dropdown with the available models
                const dropdown = this.contentEl.querySelector('.lmstudio-model-dropdown');
                if (dropdown instanceof HTMLSelectElement) {
                    dropdown.innerHTML = '';
                    this.availableModels.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        dropdown.appendChild(option);
                    });
                    dropdown.value = this.selectedModel;
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to load models:', error);
            new Notice(`Failed to load models: ${errorMessage}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
