// API Configuration and Security
const API_CONFIG = {
    baseUrl: 'https://openrouter.ai/api/v1',
    retryAttempts: 3,
    retryDelay: 1000, // Base delay in ms
    maxDelay: 10000   // Maximum delay in ms
};

class ChatbotAPI {
    constructor() {
        this.pendingRequests = new Map();
        this.rateLimiter = new RateLimiter(60, 'minute'); // 60 requests per minute
    }

    async sendMessage(message, conversationId) {
        try {
            if (!await this.rateLimiter.canMakeRequest()) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }

            const response = await this.makeRequestWithRetry(async () => {
                const result = await fetch(`${API_CONFIG.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`,
                        'HTTP-Referer': window.location.origin,
                    },
                    body: JSON.stringify({
                        model: 'openai/gpt-3.5-turbo',
                        messages: [{ role: 'user', content: message }]
                    })
                });

                if (!result.ok) {
                    throw new Error(`API request failed: ${result.status}`);
                }

                return await result.json();
            });

            return this.processResponse(response);
        } catch (error) {
            console.error('Error in sendMessage:', error);
            throw new Error('Failed to process message. Please try again.');
        }
    }

    async getAuthToken() {
        // Fetch token from secure backend endpoint
        const response = await fetch('/api/auth/token', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to get authentication token');
        }
        
        const { token } = await response.json();
        return token;
    }

    async makeRequestWithRetry(requestFn) {
        let lastError;
        for (let attempt = 0; attempt < API_CONFIG.retryAttempts; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                if (!this.shouldRetry(error)) {
                    throw error;
                }
                await this.delay(this.getRetryDelay(attempt));
            }
        }
        throw lastError;
    }

    shouldRetry(error) {
        // Retry on network errors or 5xx server errors
        return !error.response || (error.response && error.response.status >= 500);
    }

    getRetryDelay(attempt) {
        const delay = Math.min(
            API_CONFIG.maxDelay,
            API_CONFIG.retryDelay * Math.pow(2, attempt)
        );
        return delay + Math.random() * 1000; // Add jitter
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    processResponse(response) {
        // Sanitize and validate response
        if (!response || !response.choices || !response.choices[0]) {
            throw new Error('Invalid response format');
        }

        const { content } = response.choices[0].message;
        return this.sanitizeContent(content);
    }

    sanitizeContent(content) {
        // Basic XSS prevention
        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim();
    }
}

// Rate Limiter Implementation
class RateLimiter {
    constructor(limit, interval) {
        this.limit = limit;
        this.interval = this.parseInterval(interval);
        this.requests = [];
    }

    parseInterval(interval) {
        const intervals = {
            second: 1000,
            minute: 60000,
            hour: 3600000
        };
        return intervals[interval] || 60000;
    }

    async canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.interval);
        
        if (this.requests.length >= this.limit) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }
}

// Initialize chatbot with security measures
const chatbot = new ChatbotAPI();

// Export for use in other modules
export { chatbot, ChatbotAPI, RateLimiter };