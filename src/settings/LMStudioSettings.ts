import { App, Notice, PluginSettingTab, Setting } from 'obsidian';

export interface LMStudioEndpointConfig {
    baseUrl: string;
    chatCompletions: string;
    completions: string;
    embeddings: string;
    models: string;
}

export interface LMStudioSettings {
    endpoints: LMStudioEndpointConfig;
    defaultModel: string;
    requestTemplate?: string;
}

export const DEFAULT_LMSTUDIO_SETTINGS: LMStudioSettings = {
    endpoints: {
        baseUrl: 'http://localhost:1234',
        chatCompletions: '/v1/chat/completions',
        completions: '/v1/completions',
        embeddings: '/v1/embeddings',
        models: '/v1/models'
    },
    defaultModel: 'ibm/granite-3.2-8b',
    requestTemplate: ''
};

export class LMStudioSettingTab extends PluginSettingTab {
    private settings: LMStudioSettings;

    constructor(
        app: App,
        plugin: any,
        private onSettingsChange: (settings: LMStudioSettings) => Promise<void>
    ) {
        super(app, plugin);
        this.settings = { ...DEFAULT_LMSTUDIO_SETTINGS, ...(plugin.settings?.lmstudio || {}) };
    }

    public display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'LM Studio Settings' });
        
        this.addBaseUrlSetting();
        this.addDefaultModelSetting();
        this.addTestConnectionButton();
    }

    private addBaseUrlSetting(): void {
        new Setting(this.containerEl)
            .setName('Base URL')
            .setDesc('The base URL of your LM Studio server (e.g., http://localhost:1234)')
            .addText(text => text
                .setPlaceholder('http://localhost:1234')
                .setValue(this.settings.endpoints.baseUrl)
                .onChange(async (value) => {
                    this.settings.endpoints.baseUrl = value.trim();
                    await this.onSettingsChange(this.settings);
                }));
    }

    private addDefaultModelSetting(): void {
        new Setting(this.containerEl)
            .setName('Default Model')
            .setDesc('The default model to use for completions')
            .addText(text => text
                .setPlaceholder('ibm/granite-3.2-8b')
                .setValue(this.settings.defaultModel)
                .onChange(async (value) => {
                    this.settings.defaultModel = value.trim();
                    await this.onSettingsChange(this.settings);
                }));
    }

    private addTestConnectionButton(): void {
        new Setting(this.containerEl)
            .setName('Test Connection')
            .setDesc('Test the connection to the LM Studio server')
            .addButton(button => button
                .setButtonText('Test Connection')
                .onClick(async () => {
                    try {
                        const response = await fetch(`${this.settings.endpoints.baseUrl}${this.settings.endpoints.models}`);
                        if (response.ok) {
                            new Notice('✅ Connection successful!');
                        } else {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        new Notice(`❌ Connection failed: ${errorMessage}`);
                        console.error('Connection test failed:', error);
                    }
                }));
    }
}
