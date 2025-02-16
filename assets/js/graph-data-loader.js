import { config, debugLog } from './config.js';
import { PathResolver } from './path-resolver.js';

export class GraphDataLoader {
    constructor() {
        this.pathResolver = new PathResolver();
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.lastLoadAttempt = null;
        this.minRetryInterval = 5000; // 5 seconds between manual retries
        
        // Create and attach the reload button
        this.createReloadButton();
    }

    createReloadButton() {
        const button = document.createElement('button');
        button.className = 'graph-reload-button';
        button.innerHTML = '🔄 Reload Graph Data';
        button.style.display = 'none'; // Hide initially
        
        // Add tooltip for rate limiting
        button.title = 'Click to reload graph data';
        
        button.onclick = async () => {
            const now = Date.now();
            if (this.lastLoadAttempt && now - this.lastLoadAttempt < this.minRetryInterval) {
                const waitTime = Math.ceil((this.minRetryInterval - (now - this.lastLoadAttempt)) / 1000);
                button.classList.add('rate-limited');
                button.title = `Please wait ${waitTime} seconds before retrying`;
                debugLog('GraphDataLoader', `Reload rate limited. Please wait ${waitTime}s...`);
                
                // Reset button state after rate limit expires
                setTimeout(() => {
                    button.classList.remove('rate-limited');
                    button.title = 'Click to reload graph data';
                }, this.minRetryInterval);
                return;
            }
            
            this.lastLoadAttempt = now;
            this.retryCount = 0; // Reset retry count for manual reload
            button.disabled = true;
            button.innerHTML = '⏳ Loading...';
            button.title = 'Loading graph data...';
            
            try {
                const data = await this.loadDirectory();
                if (data) {
                    debugLog('GraphDataLoader', 'Manual reload successful');
                    this.hideError();
                    // Dispatch event for the graph to update
                    window.dispatchEvent(new CustomEvent('graphDataReloaded', { detail: data }));
                }
            } catch (error) {
                this.showError('Failed to reload graph data', error);
            } finally {
                button.disabled = false;
                button.innerHTML = '🔄 Reload Graph Data';
                button.title = 'Click to reload graph data';
            }
        };
        
        // Add styles for rate limiting
        if (!document.getElementById('reload-button-styles')) {
            const style = document.createElement('style');
            style.id = 'reload-button-styles';
            style.textContent = `
                .graph-reload-button.rate-limited {
                    opacity: 0.5;
                    cursor: not-allowed;
                    background: var(--warning-bg, #fff3cd) !important;
                    animation: shake 0.5s;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to document
        document.body.appendChild(button);
        this.reloadButton = button;
    }

    async loadDirectory() {
        try {
            this.lastLoadAttempt = Date.now();
            
            // First try to load from local data directory
            debugLog('GraphDataLoader', 'Attempting to load from local data directory');
            const data = await this.loadGraphData();
            if (data) {
                this.hideError();
                return data;
            }

            // If local data fails, try fallback data
            debugLog('GraphDataLoader', 'Local data not found, attempting to load fallback data');
            const fallbackData = await this.loadFallbackData();
            if (fallbackData) {
                this.showWarning('Using fallback data');
                return fallbackData;
            }

            throw new Error('No graph data available');
        } catch (error) {
            this.logError('Error loading graph data:', error);

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.logWarning(`Retrying data load (${this.retryCount}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.loadDirectory();
            }

            // Show error UI and reload button
            this.showError('Failed to load graph data', error);
            if (this.reloadButton) {
                this.reloadButton.style.display = 'block';
            }

            // Create a minimal fallback dataset if all attempts fail
            return this.createMinimalFallback();
        }
    }

    async loadGraphData() {
        try {
            const graphDataPath = this.pathResolver.resolvePath(config.paths.graphData);
            debugLog('GraphDataLoader', `Loading graph data from: ${graphDataPath}`);
            
            const response = await fetch(graphDataPath);
            if (!response.ok) {
                throw new Error(`Failed to load graph data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            debugLog('GraphDataLoader', 'Successfully loaded graph data');
            return data;
        } catch (error) {
            this.logWarning('Failed to load primary graph data:', error);
            return null;
        }
    }

    async loadFallbackData() {
        try {
            const indexPath = this.pathResolver.resolvePath(config.paths.index);
            debugLog('GraphDataLoader', `Loading fallback data from: ${indexPath}`);
            
            const response = await fetch(indexPath);
            if (!response.ok) {
                throw new Error('Failed to fetch index');
            }
            
            const data = await response.json();
            debugLog('GraphDataLoader', 'Successfully loaded fallback data');
            return data;
        } catch (error) {
            this.logWarning('Failed to load fallback data:', error);
            return null;
        }
    }

    createMinimalFallback() {
        debugLog('GraphDataLoader', 'Creating minimal fallback dataset');
        return {
            nodes: [
                {
                    id: 'root',
                    label: 'Knowledge Graph',
                    type: 'root',
                    metadata: {
                        description: 'Root node of the knowledge graph',
                        created: new Date().toISOString(),
                        status: 'generated'
                    }
                }
            ],
            edges: [],
            metadata: {
                generated: true,
                timestamp: new Date().toISOString(),
                message: 'Minimal fallback dataset generated due to data loading failure'
            }
        };
    }

    logError(message, error) {
        console.error(`[GraphDataLoader] ${message}`, error);
        debugLog('GraphDataLoader', message, { error: error.message, stack: error.stack });
    }

    logWarning(message, error = null) {
        console.warn(`[GraphDataLoader] ${message}`, error);
        debugLog('GraphDataLoader', message, error ? { error: error.message } : null);
    }

    showError(message, error) {
        const container = document.createElement('div');
        container.className = 'graph-error-container';
        
        // Include retry count in error message if applicable
        const retryInfo = this.retryCount > 0 ? 
            `<p class="retry-info">Attempted ${this.retryCount} automatic retries</p>` : '';
        
        container.innerHTML = `
            <div class="graph-error-message">
                <h3>⚠️ ${message}</h3>
                <p>${error.message}</p>
                ${retryInfo}
                <div class="graph-error-details">
                    <p>Troubleshooting steps:</p>
                    <ul>
                        <li>Check your internet connection</li>
                        <li>Verify the data files exist in the correct location</li>
                        <li>Try refreshing the page</li>
                        <li>Check the browser console for detailed errors (Press F12)</li>
                        <li>Clear your browser cache and reload</li>
                    </ul>
                </div>
            </div>
        `;

        // Update styles to include retry info
        if (!document.getElementById('graph-error-styles')) {
            const style = document.createElement('style');
            style.id = 'graph-error-styles';
            style.textContent = `
                .graph-error-container {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--error-bg, rgba(255, 0, 0, 0.1));
                    border: 1px solid var(--error-border, #ff4444);
                    border-radius: 8px;
                    padding: 2rem;
                    max-width: 90%;
                    width: 400px;
                    text-align: center;
                    z-index: 1000;
                }

                .graph-error-message h3 {
                    color: var(--error-text, #ff4444);
                    margin-bottom: 1rem;
                }

                .graph-error-details {
                    text-align: left;
                    margin-top: 1rem;
                    font-size: 0.9em;
                }

                .graph-reload-button {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: var(--primary-color, #4a90e2);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    font-weight: 500;
                    z-index: 1001;
                }

                .graph-reload-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .graph-warning-banner {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--warning-bg, #fff3cd);
                    border: 1px solid var(--warning-border, #ffeeba);
                    border-radius: 4px;
                    padding: 0.75rem 1rem;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    animation: slideDown 0.3s ease-out;
                }

                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); }
                    to { transform: translate(-50%, 0); }
                }

                .retry-info {
                    color: var(--warning-text, #856404);
                    font-style: italic;
                    margin: 0.5rem 0;
                }
            `;
            document.head.appendChild(style);
        }

        // Remove any existing error container
        const existingError = document.querySelector('.graph-error-container');
        if (existingError) {
            existingError.remove();
        }

        document.body.appendChild(container);
    }

    showWarning(message) {
        const banner = document.createElement('div');
        banner.className = 'graph-warning-banner';
        banner.innerHTML = `
            <span>⚠️ ${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(banner);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (banner.parentElement) {
                banner.remove();
            }
        }, 5000);
    }

    hideError() {
        const errorContainer = document.querySelector('.graph-error-container');
        if (errorContainer) {
            errorContainer.remove();
        }
        if (this.reloadButton) {
            this.reloadButton.style.display = 'none';
        }
    }
} 