import { Notice, Editor } from 'obsidian';
import type { PromptsService } from './promptsService';
import { LMStudioSettings } from '../settings/LMStudioSettings';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface LMStudioResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export interface LMStudioOptions {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    system_prompt?: string | undefined;
    model?: string;
    stream?: boolean;
    editor?: Editor; 
}



export class LMStudioService {
    constructor(
        private settings: LMStudioSettings,
        public promptsService: PromptsService
    ) {}
    
    // Removed getPromptsService as we made promptsService public



    public async queryLMStudio(
        prompt: string, 
        options: LMStudioOptions = {}
    ): Promise<string> {
        try {
            const endpoint = this.settings.lmStudioEndpoint.endsWith('/') 
                ? `${this.settings.lmStudioEndpoint}chat/completions`
                : `${this.settings.lmStudioEndpoint}/chat/completions`;

            const requestBody: any = {
                model: 'local-model', // This will be overridden by LM Studio
                messages: [
                    ...(options.system_prompt 
                        ? [{ role: 'system', content: options.system_prompt }] 
                        : []),
                    { role: 'user', content: prompt }
                ],
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 1000,
                top_p: options.top_p ?? 1.0,
                stream: false
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
            
        } catch (error) {
            console.error('LM Studio API request failed:', error);
            throw new Error(`Failed to query LM Studio: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getModels(): Promise<string[]> {
        try {
            const response = await this.makeRequest(this.settings.endpoints.models, 'GET');
            return response.data.map((model: any) => model.id);
        } catch (error: unknown) {
            console.error('Failed to fetch models:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`❌ Failed to fetch models: ${errorMessage}`);
            return [];
        }
    }

    public async sendChat(messages: ChatMessage[], options: LMStudioOptions = {}): Promise<string> {
        try {
            const payload = {
                model: this.settings.defaultModel,
                messages: [
                    ...(options.system_prompt ? [{ role: 'system' as const, content: options.system_prompt }] : []),
                    ...messages
                ],
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 1000,
                top_p: options.top_p ?? 1.0,
            };

            const response = await this.makeRequest(
                this.settings.endpoints.chatCompletions,
                'POST',
                payload
            ) as LMStudioResponse;

            return response.choices[0]?.message?.content || 'No response from model';
        } catch (error: unknown) {
            console.error('Chat completion failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get chat completion: ${errorMessage}`);
        }
    }

    private async makeRequest(endpoint: string, method: string, data?: unknown): Promise<any> {
        const url = `${this.settings.endpoints.baseUrl}${endpoint}`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const requestInit: RequestInit = {
            method,
            headers,
        };

        if (data !== undefined) {
            requestInit.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, requestInit);

            if (!response.ok) {
                let errorMessage = `Request failed with status ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json() as { error?: { message?: string } };
                    if (errorData?.error?.message) {
                        errorMessage = errorData.error.message;
                    }
                } catch (e) {
                    // Ignore JSON parse errors, use default error message
                }
                throw new Error(errorMessage);
            }

            return response.json();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Request failed: ${errorMessage}`);
        }
    }

    public updateSettings(settings: LMStudioSettings) {
        this.settings = { ...this.settings, ...settings };
    }
}
