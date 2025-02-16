// Session Manager for rolodexter
// Handles daily session tracking and HTML file generation

export class SessionManager {
    constructor() {
        this.currentDate = new Date();
        this.sessionId = crypto.randomUUID();
        this.events = [];
        this.lastSave = Date.now();
        this.saveInterval = 5 * 60 * 1000; // Save every 5 minutes
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        this.startPeriodicSave();
        this.logSessionStart();
        this.initialized = true;
    }

    setupEventListeners() {
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.logEvent('visibility_change', {
                state: document.visibilityState
            });
        });

        // Page unload
        window.addEventListener('beforeunload', () => {
            this.logEvent('session_end');
            this.saveSession(true); // Force immediate save
        });

        // Navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                this.logEvent('navigation', {
                    href: link.href,
                    text: link.textContent.trim()
                });
            }
        });

        // Theme changes
        window.addEventListener('themechange', (e) => {
            this.logEvent('theme_change', {
                theme: e.detail.theme
            });
        });
    }

    logEvent(type, data = {}) {
        const event = {
            type,
            timestamp: new Date().toISOString(),
            data,
            sessionId: this.sessionId
        };
        this.events.push(event);

        // Check if we should save
        if (Date.now() - this.lastSave >= this.saveInterval) {
            this.saveSession();
        }
    }

    logSessionStart() {
        this.logEvent('session_start', {
            userAgent: navigator.userAgent,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            theme: document.documentElement.dataset.theme || 'light'
        });
    }

    async saveSession(force = false) {
        if (!force && Date.now() - this.lastSave < this.saveInterval) {
            return;
        }

        if (this.events.length === 0) {
            return;
        }

        try {
            const date = new Date();
            const year = date.getFullYear().toString();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            const sessionHtml = this.generateSessionHtml(year, month, day);
            
            const response = await fetch('/api/sessions/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    year,
                    month,
                    day,
                    content: sessionHtml
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.lastSave = Date.now();
            this.events = []; // Clear saved events
            
            console.debug(`[SessionManager] Saved session to ${year}/${month}/${day}.html`);
        } catch (error) {
            console.error('[SessionManager] Failed to save session:', error);
            // Fallback to localStorage if API fails
            this.saveToLocalStorage();
        }
    }

    saveToLocalStorage() {
        try {
            const date = new Date();
            const key = `session_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
            const existingSessions = JSON.parse(localStorage.getItem(key) || '[]');
            existingSessions.push(...this.events);
            localStorage.setItem(key, JSON.stringify(existingSessions));
            console.debug(`[SessionManager] Saved ${existingSessions.length} events to localStorage`);
        } catch (error) {
            console.error('[SessionManager] Failed to save to localStorage:', error);
        }
    }

    generateSessionHtml(year, month, day) {
        const title = `Session Log ${year}-${month}-${day}`;
        const timestamp = new Date().toISOString();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="../../../../../assets/brand/favicon_io/favicon-32x32.png">
    
    <!-- Styles -->
    <link rel="stylesheet" href="../../../../../assets/css/style.css">
    <link rel="stylesheet" href="../../../../../assets/css/documentation.css">
    
    <!-- Knowledge Graph Metadata -->
    <meta name="description" content="Daily session log for rolodexter Labs">
    <meta name="keywords" content="session log, activity tracking, user interactions">
    <meta name="graph-tags" content="session-log, tracking, daily-log">
    <meta name="graph-category" content="documentation">
    <meta name="graph-connections" content="../../../index.html">
    <meta name="graph-created" content="${timestamp}">
    <meta name="graph-modified" content="${timestamp}">
    <meta name="graph-authors" content="rolodexterVS">
    <meta name="graph-status" content="active">
</head>
<body class="documentation-page">
    <main class="container">
        <article class="memory-content">
            <h1>${title}</h1>
            
            <section class="session-overview">
                <h2>Session Overview</h2>
                <ul>
                    <li><strong>Total Sessions:</strong> ${this.events.filter(e => e.type === 'session_start').length}</li>
                    <li><strong>Total Events:</strong> ${this.events.length}</li>
                    <li><strong>First Event:</strong> ${this.events[0]?.timestamp || 'N/A'}</li>
                    <li><strong>Last Event:</strong> ${this.events[this.events.length - 1]?.timestamp || 'N/A'}</li>
                </ul>
            </section>

            <section class="session-events">
                <h2>Event Log</h2>
                <div class="timeline-section">
                    ${this.events.map(event => `
                    <div class="timeline-item">
                        <h3>${event.type}</h3>
                        <p class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</p>
                        <pre><code>${JSON.stringify(event.data, null, 2)}</code></pre>
                    </div>
                    `).join('\n')}
                </div>
            </section>

            <footer class="task-footer">
                <div class="status-block">
                    <p class="status-item"><span class="status-label">Generated by:</span> rolodexterVS</p>
                    <p class="status-item"><span class="status-label">Last Updated:</span> ${timestamp}</p>
                </div>
            </footer>
        </article>
    </main>

    <script src="../../../../../assets/js/script.js"></script>
</body>
</html>`;
    }

    startPeriodicSave() {
        setInterval(() => this.saveSession(), this.saveInterval);
    }

    cleanup() {
        this.saveSession(true);
    }
}

// Initialize session manager
const sessionManager = new SessionManager();
sessionManager.initialize();

export { sessionManager }; 