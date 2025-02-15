// API Configuration and Security
const API_CONFIG = {
    baseUrl: 'https://openrouter.ai/api/v1',
    retryAttempts: 3,
    retryDelay: 1000, // Base delay in ms
    maxDelay: 10000   // Maximum delay in ms
};

class ChatbotAPI {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.pendingRequests = [];
        this.retryCount = 0;
        this.maxRetries = 3;
        this.pendingRequests = new Map();
        this.rateLimiter = new RateLimiter(60, 'minute'); // 60 requests per minute
    }

    async initialize() {
        await this.ensureValidToken();
    }

    async ensureValidToken() {
        if (this.isTokenValid()) {
            return this.token;
        }

        if (this.isRefreshing) {
            return new Promise(resolve => {
                this.pendingRequests.push(resolve);
            });
        }

        try {
            this.isRefreshing = true;
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const { token, expires } = await response.json();
            this.token = token;
            this.tokenExpiry = expires;
            
            // Resume pending requests
            this.pendingRequests.forEach(resolve => resolve(token));
            this.pendingRequests = [];
            
            return token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    isTokenValid() {
        return this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }

    async sendMessage(message) {
        try {
            const token = await this.ensureValidToken();
            const response = await this.makeAuthenticatedRequest('/api/auth/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            this.retryCount = 0; // Reset retry count on success
            return await response.json();
        } catch (error) {
            await this.handleRequestError(error);
        }
    }

    async makeAuthenticatedRequest(url, options) {
        const token = await this.ensureValidToken();
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, options);
        
        if (response.status === 401) {
            // Token might be invalid, try to refresh
            this.token = null;
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                return this.makeAuthenticatedRequest(url, options);
            }
        }
        
        return response;
    }

    async handleRequestError(error) {
        // Log error to debug file
        await this.logError(error);

        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
            return this.sendMessage(message);
        }

        throw new Error('Failed to send message after multiple attempts');
    }

    async logError(error) {
        try {
            const timestamp = new Date().toISOString();
            const debugEntry = {
                timestamp,
                error: error.message,
                retryCount: this.retryCount
            };

            await fetch('/api/debug/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(debugEntry)
            });
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
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

// Initialize chatbot with authentication
const chatbot = new ChatbotAPI();
chatbot.initialize().catch(console.error);

// Export for use in other modules
export { chatbot, ChatbotAPI, RateLimiter };