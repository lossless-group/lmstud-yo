export interface PromptSettings {
    // System prompts
    lmStudioDefaultSystemPrompt: string;
    
    // Placeholder text
    lmStudioQueryPlaceholder: string;
    lmStudioSystemPromptPlaceholder: string;
    articleTermPlaceholder: string;
    articleTermDescription: string;
    
    // Notices and messages
    enterQuestionNotice: string;
    enterTermNotice: string;
    
    // Article generator template
    articleGeneratorTemplate: string;
    
    // Image prompts
    imageReferencesPrompt: string;
}

export class PromptsService {
    private settings: PromptSettings;

    constructor(settings: PromptSettings) {
        this.settings = settings;
    }

    // System prompts


    getLMStudioDefaultSystemPrompt(): string {
        return this.settings.lmStudioDefaultSystemPrompt;
    }

    getLMStudioQueryPlaceholder(): string {
        return this.settings.lmStudioQueryPlaceholder;
    }

    getLMStudioSystemPromptPlaceholder(): string {
        return this.settings.lmStudioSystemPromptPlaceholder;
    }

    getArticleTermPlaceholder(): string {
        return this.settings.articleTermPlaceholder;
    }

    getArticleTermDescription(): string {
        return this.settings.articleTermDescription;
    }

    getEnterQuestionNotice(): string {
        return this.settings.enterQuestionNotice;
    }

    getEnterTermNotice(): string {
        return this.settings.enterTermNotice;
    }

    // Article generator template
    getArticleGeneratorTemplate(term: string): string {
        return this.settings.articleGeneratorTemplate.replace(/{TERM}/g, term);
    }

    // Image prompts
    getImageReferencesPrompt(): string {
        return this.settings.imageReferencesPrompt;
    }

    // Template processing for request bodies
    processTemplate(template: string): string {
        return template
            .replace(/{{LMSTUDIO_SYSTEM_PROMPT}}/g, this.settings.lmStudioDefaultSystemPrompt);
    }

    // Update settings
    updateSettings(newSettings: PromptSettings): void {
        this.settings = newSettings;
    }
} 