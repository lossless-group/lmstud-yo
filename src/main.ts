import { Plugin, Notice, PluginSettingTab, App, Setting } from 'obsidian';
import { LMStudioService } from './services/LMStudioService';
import { LMStudioModal } from './modals/LMStudioModal';
import { LMStudioSettings, DEFAULT_LMSTUDIO_SETTINGS } from './settings/LMStudioSettings';

interface LMStudioPluginSettings {
    lmstudio: LMStudioSettings;
}

export default class LMStudioPlugin extends Plugin {
    private settings: any;
    private service: LMStudioService;

    async onload() {
        console.log('Loading LM Studio plugin');
        
        // Load settings
        await this.loadSettings();
        
        // Initialize the service
        this.service = new LMStudioService(this.settings.lmstudio || {});
        
        // Add settings tab
        this.addSettingTab(new LMStudioSettingTab(
            this.app,
            this,
            this.handleSettingsChange.bind(this)
        ));
        
        // Add ribbon icon
        this.addRibbonIcon('message-square', 'LM Studio Chat', () => {
            this.openChatModal();
        });
        
        // Add command to open chat
        this.addCommand({
            id: 'open-lmstudio-chat',
            name: 'Open LM Studio Chat',
            callback: () => {
                this.openChatModal();
            }
        });
        
        // Add editor command
        this.addCommand({
            id: 'generate-with-lmstudio',
            name: 'Generate with LM Studio',
            editorCallback: async (editor) => {
                const selectedText = editor.getSelection();
                const prompt = selectedText || 'Generate content about:';
                
                try {
                    const response = await this.service.sendChat([
                        { role: 'user', content: prompt }
                    ]);
                    
                    editor.replaceSelection(response);
                } catch (error) {
                    console.error('Generation failed:', error);
                    new Notice(`Generation failed: ${error.message}`);
                }
            }
        });
    }
    
    private async loadSettings() {
        this.settings = Object.assign(
            { lmstudio: {} },
            await this.loadData()
        );
    }
    
    private async saveSettings() {
        await this.saveData(this.settings);
    }
    
    private handleSettingsChange = async (settings: any) => {
        this.settings.lmstudio = settings;
        await this.saveSettings();
        
        // Update service with new settings
        if (this.service) {
            this.service.updateSettings(settings);
        }
    };
    
    private openChatModal() {
        new LMStudioModal(
            this.app,
            this.settings,
            async (message: string, model: string) => {
                // Save the selected model if it's different from the current default
                if (model && model !== this.settings.lmstudio?.defaultModel) {
                    await this.handleSettingsChange({
                        ...this.settings.lmstudio,
                        defaultModel: model
                    });
                }
                
                // Get response from LM Studio
                const response = await this.service.sendChat([
                    { role: 'user', content: message }
                ]);
                
                return response;
            }
        ).open();
    }
    
    onunload() {
        console.log('Unloading LM Studio plugin');
    }
}
