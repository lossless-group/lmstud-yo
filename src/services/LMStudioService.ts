import { Editor } from 'obsidian';

export interface LMStudioSettings {
    lmStudioEndpoint: string;
    defaultModel?: string;
    endpoints?: {
        chatCompletions: string;
    };
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface LMStudioOptions {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    system_prompt?: string;
    model?: string;
    stream?: boolean;
    editor?: Editor;
}

interface LMStudioResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
    data?: Array<{ id: string }>;
}

export class LMStudioService {
    public promptsService: any; // To be set by the constructor
    
    constructor(
        private settings: LMStudioSettings,
        promptsService?: any
    ) {
        this.promptsService = promptsService;
    }

    public async queryLMStudio(prompt: string, options: LMStudioOptions = {}): Promise<string> {
        const endpoint = '/v1/chat/completions';
        const requestBody = {
            model: options.model || 'ibm/granite-3.2-8b',
            messages: [
                ...(options.system_prompt 
                    ? [{ role: 'system' as const, content: options.system_prompt }] 
                    : []),
                { role: 'user' as const, content: prompt }
            ],
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 1000,
            top_p: options.top_p ?? 1.0,
            stream: options.stream ?? false
        };

        const response = await this.makeRequest(endpoint, 'POST', requestBody);
        return response.choices?.[0]?.message?.content || '';
    }

    public async getModels(): Promise<string[]> {
        const endpoint = '/models';
        const response = await this.makeRequest(endpoint, 'GET');
        return response.data?.map((model: any) => model.id) || [];
    }

    public async sendChat(messages: ChatMessage[], options: LMStudioOptions = {}): Promise<string> {
        const endpoint = this.settings.endpoints?.chatCompletions || '/chat/completions';
        const payload = {
            model: options.model || this.settings.defaultModel || 'local-model',
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 1000,
            top_p: options.top_p ?? 1.0,
        };

        const response = await this.makeRequest(endpoint, 'POST', payload) as LMStudioResponse;
        return response.choices[0]?.message?.content || 'No response from model';
    }

    public updateSettings(settings: Partial<LMStudioSettings>) {
        this.settings = { ...this.settings, ...settings };
    }

    private async makeRequest(endpoint: string, method: string, data?: unknown): Promise<any> {
        const baseUrl = this.settings.lmStudioEndpoint.trim();
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        const fullUrl = `${baseUrl}/${cleanEndpoint}`;
        
        console.log('Making request to:', fullUrl);
        
        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit' as RequestCredentials
        };
            
        if (data !== undefined) {
            fetchOptions.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(fullUrl, fetchOptions);

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error?.message) {
                        errorMessage = errorData.error.message;
                    } else if (typeof errorData === 'object') {
                        errorMessage = JSON.stringify(errorData, null, 2);
                    }
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                console.error('Request failed with status:', response.status);
                console.error('Error details:', errorMessage);
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            throw error;
        }
    }
}
