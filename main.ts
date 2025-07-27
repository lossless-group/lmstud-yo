import { Plugin, Notice } from 'obsidian';
import { LMStudioService } from './src/services/LMStudioService';
import { LMStudioModal } from './src/modals/LMStudioModal';
import { LMStudioSettings, DEFAULT_LMSTUDIO_SETTINGS, LMStudioSettingTab } from './src/settings/LMStudioSettings';
import { PromptsService } from './src/services/promptsService';

interface LMStudioPluginSettings {
    lmstudio: LMStudioSettings;
}

export default class LMStudioPlugin extends Plugin {
    private settings: LMStudioPluginSettings = { lmstudio: { ...DEFAULT_LMSTUDIO_SETTINGS } };
    private service!: LMStudioService; // Using definite assignment assertion

    async onload() {
        console.log('Loading LM Studio plugin');
        
        // Load settings
        await this.loadSettings();
        
        // Initialize prompts service
        const promptsService = new PromptsService({
            lmStudioDefaultSystemPrompt: 'You are a helpful AI assistant.',
            lmStudioQueryPlaceholder: 'Ask me anything...',
            lmStudioSystemPromptPlaceholder: 'Enter system prompt...',
            articleTermPlaceholder: 'Enter a term to generate an article about...',
            articleTermDescription: 'The term to generate an article about',
            enterQuestionNotice: 'Please enter a question',
            enterTermNotice: 'Please enter a term',
            articleGeneratorTemplate: 'Generate a comprehensive article about: {term}',
            imageReferencesPrompt: 'Include relevant images for: {content}'
        });
        
        // Initialize the service with prompts service
        this.service = new LMStudioService(
            {
                ...DEFAULT_LMSTUDIO_SETTINGS,
                ...(this.settings.lmstudio || {})
            },
            promptsService
        );
        
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
                    const response = await this.service.queryLMStudio(prompt, {
                        model: this.settings.lmstudio.defaultModel
                    });
                    
                    editor.replaceSelection(response);
                } catch (error) {
                    console.error('Generation failed:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    new Notice(`Generation failed: ${errorMessage}`);
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
    
    private handleSettingsChange = async (settings: LMStudioSettings) => {
        this.settings.lmstudio = settings;
        await this.saveSettings();
        
        // Update service with new settings
        if (this.service) {
            this.service.updateSettings(settings);
        }
    };
    
    private openChatModal() {
        const editor = this.app.workspace.activeEditor?.editor;
        if (editor) {
            const modal = new LMStudioModal(
                this.app,
                editor,
                this.service,
                this.service.promptsService
            );
            modal.open();
        } else {
            new Notice('Please open an editor first');
        }
    }
    
    onunload() {
        console.log('Unloading LM Studio plugin');
    }
}
