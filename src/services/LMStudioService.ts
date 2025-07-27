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
    return_images?: boolean;
}

export class LMStudioService {
    public promptsService: any; // To be set by the constructor
    public settings: LMStudioSettings;
    
    constructor(
        settings: LMStudioSettings,
        promptsService?: any
    ) {
        this.settings = settings;
        this.promptsService = promptsService;
    }

    public async queryLMStudio(prompt: string, options: LMStudioOptions = {}): Promise<string> {
        const endpoint = '/v1/chat/completions';
        const stream = options.stream ?? true;
        
        try {
            const messages: any[] = [];
            
            // Add system message if provided
            if (options.system_prompt) {
                messages.push({ role: 'system', content: options.system_prompt });
            }
            
            // Add user query
            messages.push({ role: 'user', content: prompt });
            
            const payload = {
                model: options.model || 'ibm/granite-3.2-8b',
                messages,
                stream,
                max_tokens: options.max_tokens ?? 2048,
                temperature: options.temperature ?? 0.7,
                top_p: options.top_p ?? 0.9
            };
            
            const response = await fetch(`${this.settings.lmStudioEndpoint}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            if (stream) {
                return this.handleStreamingResponse(response, options);
            } else {
                const data = await response.json();
                return data.choices?.[0]?.message?.content || '';
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('LM Studio Error:', error);
            throw new Error(`LM Studio Error: ${errorMsg}`);
        }
    }

    public async getModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.settings.lmStudioEndpoint}/v1/models`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data?.map((model: any) => model.id) || [];
        } catch (error) {
            console.error('Failed to fetch models:', error);
            return [];
        }
    }

    public async sendChat(messages: ChatMessage[], options: LMStudioOptions = {}): Promise<string> {
        try {
            const payload = {
                model: options.model || 'ibm/granite-3.2-8b',
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 2048,
                top_p: options.top_p ?? 0.9,
                stream: false
            };

            const response = await fetch(`${this.settings.lmStudioEndpoint}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'No response from model';
        } catch (error) {
            console.error('Chat request failed:', error);
            throw error;
        }
    }

    public updateSettings(settings: Partial<LMStudioSettings>) {
        this.settings = { ...this.settings, ...settings };
    }

    private async handleStreamingResponse(
        response: Response,
        options: LMStudioOptions
    ): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullResponse = '';
        let cursorPosition: { line: number, ch: number } | null = null;
        
        // If we have an editor, get the current cursor position
        if (options.editor) {
            const cursor = options.editor.getCursor();
            cursorPosition = { line: cursor.line, ch: cursor.ch };
            
            // Insert a new line if we're not at the start of a line
            if (cursor.ch > 0) {
                options.editor.replaceRange('\n\n', cursor);
                cursorPosition.line += 2;
                cursorPosition.ch = 0;
            }
        }
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Process complete lines from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const data = line.replace('data: ', '').trim();
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.choices?.[0]?.delta?.content) {
                            let content = parsed.choices[0].delta.content;
                            fullResponse += content;
                    
                            console.log('Received chunk:', content);
                            
                            // Update the editor with the new content
                            if (options.editor && cursorPosition) {
                                // Insert the new content at the cursor position
                                options.editor.replaceRange(content, cursorPosition);
                                
                                // Update the cursor position for the next chunk
                                const lines = content.split('\n');
                                if (lines.length > 1) {
                                    cursorPosition.line += lines.length - 1;
                                    cursorPosition.ch = lines[lines.length - 1].length;
                                } else {
                                    cursorPosition.ch += content.length;
                                }
                                
                                // Scroll the editor to show the new content
                                options.editor.scrollIntoView({
                                    from: cursorPosition,
                                    to: cursorPosition
                                }, true);
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing JSON chunk:', e);
                        // Ignore JSON parse errors for partial chunks
                    }
                }
            }
        }
        
        // If we have an editor and no content was written (e.g., error case), show a notice
        if (options.editor && fullResponse === '') {
            const errorMsg = 'No response received from LM Studio. Check the console for details.';
            options.editor.replaceRange(errorMsg, cursorPosition || options.editor.getCursor());
            console.error('Empty response from LM Studio');
        }
        
        return fullResponse;
    }

    public async handleNonStreamingResponse(
        response: Response, 
        editor: Editor, 
        responseCursor: { line: number; ch: number }
    ): Promise<string> {
        try {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || 'No response received';
            
            // Insert the content at the specified cursor position
            editor.replaceRange(content, responseCursor);
            
            // Scroll to show the inserted content
            const endCursor = {
                line: responseCursor.line + content.split('\n').length - 1,
                ch: responseCursor.ch + (content.split('\n').pop()?.length || 0)
            };
            
            editor.scrollIntoView({
                from: responseCursor,
                to: endCursor
            }, true);
            
            return content;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error in handleNonStreamingResponse:', error);
            editor.replaceRange(`\n\nError: ${errorMsg}`, responseCursor);
            throw error;
        }
    }
}
