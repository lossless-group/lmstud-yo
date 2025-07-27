import { Notice } from 'obsidian';
import { LMStudioSettings } from '../settings/LMStudioSettings';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LMStudioResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatMessage;
        finish_reason: string | null;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface LMStudioOptions {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    system_prompt?: string;
    return_images?: boolean;
}

export class LMStudioService {
    private settings: LMStudioSettings;

    constructor(settings: LMStudioSettings) {
        this.settings = settings;
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
