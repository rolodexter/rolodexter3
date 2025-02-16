import { config, setEnvironmentMode, enableDebug, debugLog } from '../config.js';

export class SettingsPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.lastRefresh = localStorage.getItem('lastManualRefresh') || null;
        this.createPanel();
        this.loadStoredSettings();
    }

    createPanel() {
        // Create panel container
        this.panel = document.createElement('div');
        this.panel.className = 'settings-panel';
        this.panel.innerHTML = `
            <style>
                .settings-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: var(--panel-bg, rgba(255, 255, 255, 0.95));
                    border: 1px solid var(--border-color, #ccc);
                    border-radius: 8px;
                    padding: 1rem;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                    min-width: 300px;
                    transform: translateX(120%);
                    transition: transform 0.3s ease;
                }

                .settings-panel.visible {
                    transform: translateX(0);
                }

                .settings-toggle {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: var(--button-bg, #4a90e2);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 48px;
                    height: 48px;
                    cursor: pointer;
                    z-index: 1001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }

                .settings-section {
                    margin-bottom: 1rem;
                }

                .settings-section h3 {
                    margin: 0 0 0.5rem;
                    font-size: 1rem;
                }

                .settings-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .settings-row label {
                    flex: 1;
                    margin-right: 1rem;
                }

                .refresh-info {
                    font-size: 0.8rem;
                    color: #666;
                    margin-top: 0.5rem;
                }

                .debug-logs {
                    max-height: 200px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 0.8rem;
                    background: #f5f5f5;
                    padding: 0.5rem;
                    border-radius: 4px;
                    margin-top: 0.5rem;
                }
            </style>
            <div class="settings-section">
                <h3>Environment</h3>
                <div class="settings-row">
                    <label>Mode:</label>
                    <select id="environment-mode">
                        <option value="auto">Auto-detect</option>
                        <option value="github-pages">GitHub Pages</option>
                        <option value="local">Local Development</option>
                    </select>
                </div>
            </div>
            <div class="settings-section">
                <h3>Debug Options</h3>
                <div class="settings-row">
                    <label>Enable Debug Mode:</label>
                    <input type="checkbox" id="debug-enabled">
                </div>
                <div class="settings-row">
                    <label>Log Cache Operations:</label>
                    <input type="checkbox" id="debug-cache">
                </div>
                <div class="settings-row">
                    <label>Log Path Resolution:</label>
                    <input type="checkbox" id="debug-paths">
                </div>
                <div class="debug-logs" style="display: none;"></div>
            </div>
            <div class="settings-section">
                <h3>Cache Control</h3>
                <div class="settings-row">
                    <button id="force-refresh">Force Refresh</button>
                </div>
                <div class="refresh-info"></div>
            </div>
        `;

        // Create toggle button
        const toggle = document.createElement('button');
        toggle.className = 'settings-toggle';
        toggle.innerHTML = '⚙️';
        toggle.onclick = () => this.togglePanel();

        // Add to document
        document.body.appendChild(this.panel);
        document.body.appendChild(toggle);

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Environment mode
        const modeSelect = this.panel.querySelector('#environment-mode');
        modeSelect.value = config.environment.forceMode || 'auto';
        modeSelect.onchange = (e) => {
            const mode = e.target.value;
            if (mode === 'auto') {
                config.environment.forceMode = null;
            } else {
                setEnvironmentMode(mode);
            }
            localStorage.setItem('environmentMode', mode);
            this.logDebug('Environment', `Mode changed to: ${mode}`);
        };

        // Debug options
        const debugEnabled = this.panel.querySelector('#debug-enabled');
        debugEnabled.checked = config.debug.enabled;
        debugEnabled.onchange = (e) => {
            enableDebug({ enabled: e.target.checked });
            localStorage.setItem('debugEnabled', e.target.checked);
            this.updateDebugUI();
        };

        const debugCache = this.panel.querySelector('#debug-cache');
        debugCache.checked = config.debug.logCacheOperations;
        debugCache.onchange = (e) => {
            config.debug.logCacheOperations = e.target.checked;
            localStorage.setItem('debugCache', e.target.checked);
        };

        const debugPaths = this.panel.querySelector('#debug-paths');
        debugPaths.checked = config.debug.logPathResolution;
        debugPaths.onchange = (e) => {
            config.debug.logPathResolution = e.target.checked;
            localStorage.setItem('debugPaths', e.target.checked);
        };

        // Force refresh
        const refreshBtn = this.panel.querySelector('#force-refresh');
        refreshBtn.onclick = () => this.handleForceRefresh();

        this.updateRefreshInfo();
    }

    loadStoredSettings() {
        // Load environment mode
        const storedMode = localStorage.getItem('environmentMode');
        if (storedMode && storedMode !== 'auto') {
            setEnvironmentMode(storedMode);
        }

        // Load debug settings
        const debugEnabled = localStorage.getItem('debugEnabled') === 'true';
        const debugCache = localStorage.getItem('debugCache') === 'true';
        const debugPaths = localStorage.getItem('debugPaths') === 'true';

        enableDebug({
            enabled: debugEnabled,
            logCacheOperations: debugCache,
            logPathResolution: debugPaths
        });

        this.updateDebugUI();
    }

    togglePanel() {
        this.isVisible = !this.isVisible;
        this.panel.classList.toggle('visible', this.isVisible);
    }

    async handleForceRefresh() {
        const now = Date.now();
        const lastRefresh = parseInt(this.lastRefresh, 10);

        // Prevent refresh spam (minimum 5 seconds between refreshes)
        if (lastRefresh && now - lastRefresh < 5000) {
            this.logDebug('Cache', 'Refresh rate limited. Please wait...');
            return;
        }

        try {
            // Clear cache and reload data
            localStorage.removeItem('graphData');
            config.cache.forceRefresh = true;
            
            // Trigger a reload of the graph data
            const event = new CustomEvent('forceGraphRefresh');
            window.dispatchEvent(event);

            // Update last refresh timestamp
            this.lastRefresh = now;
            localStorage.setItem('lastManualRefresh', now);
            this.updateRefreshInfo();

            this.logDebug('Cache', 'Manual refresh triggered successfully');
        } catch (error) {
            this.logDebug('Cache', `Refresh failed: ${error.message}`);
        }
    }

    updateRefreshInfo() {
        const info = this.panel.querySelector('.refresh-info');
        if (this.lastRefresh) {
            const date = new Date(parseInt(this.lastRefresh, 10));
            info.textContent = `Last manual refresh: ${date.toLocaleString()}`;
        } else {
            info.textContent = 'No manual refresh yet';
        }
    }

    updateDebugUI() {
        const logsContainer = this.panel.querySelector('.debug-logs');
        logsContainer.style.display = config.debug.enabled ? 'block' : 'none';
    }

    logDebug(category, message) {
        if (!config.debug.enabled) return;

        const logsContainer = this.panel.querySelector('.debug-logs');
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toISOString()}] [${category}] ${message}`;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        // Keep only last 100 log entries
        while (logsContainer.children.length > 100) {
            logsContainer.removeChild(logsContainer.firstChild);
        }

        // Also log to console
        debugLog(category, message);
    }
} 