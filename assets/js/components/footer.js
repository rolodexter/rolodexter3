// Footer initialization and dynamic session links handler
document.addEventListener("DOMContentLoaded", function () {
    // Utility functions
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatDisplayDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };
    const formatDateTime = (date) => date.toISOString().replace('T', ' ').slice(0, -5) + ' UTC';

    // Task statistics tracking
    function updateTaskStatistics() {
        const taskStats = document.querySelector('.footer-task-stats');
        if (taskStats) {
            fetch('/assets/data/tasks.json')
                .then(response => response.json())
                .then(data => {
                    const stats = calculateTaskStats(data);
                    taskStats.innerHTML = `
                        <span title="Active Tasks">🔄 ${stats.active}</span>
                        <span title="Completed Today">✅ ${stats.completedToday}</span>
                        <span title="High Priority">⚡ ${stats.highPriority}</span>
                    `;
                })
                .catch(() => {
                    taskStats.style.display = 'none';
                });
        }
    }

    function calculateTaskStats(data) {
        const today = new Date().toISOString().split('T')[0];
        return {
            active: data.tasks?.filter(t => t.status === 'active').length || 0,
            completedToday: data.tasks?.filter(t => t.completedDate?.startsWith(today)).length || 0,
            highPriority: data.tasks?.filter(t => t.priority === 'high' && t.status === 'active').length || 0
        };
    }

    // Enhanced session link handling
    function updateSessionLinks() {
        const sessionList = document.querySelector('.session-links');
        const sessionStatus = document.querySelector('.session-status');
        if (!sessionList) return;

        sessionList.innerHTML = '';
        const today = new Date();
        let loadedSessions = 0;
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'session-loading';
        loadingIndicator.textContent = 'Loading recent sessions...';
        sessionList.appendChild(loadingIndicator);

        // Enhanced session link creation
        async function createSessionLink(date) {
            const formattedDate = formatDate(date);
            const displayDate = formatDisplayDate(date);
            const [year, month, day] = formattedDate.split('-');
            const sessionURL = `/memory/rolodexterVS/memories/sessions/${year}/${month}/${day}.html`;

            try {
                const response = await fetch(sessionURL, { method: 'HEAD' });
                if (response.ok) {
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = sessionURL;
                    link.innerHTML = `
                        <span class="session-icon">📝</span>
                        <span class="session-date">${displayDate}</span>
                        <span class="session-indicator">●</span>
                    `;
                    link.setAttribute('data-session-date', formattedDate);
                    link.className = 'session-link';
                    listItem.appendChild(link);
                    return listItem;
                }
            } catch (error) {
                console.warn(`Session not found for ${formattedDate}`);
            }
            return null;
        }

        // Load sessions in parallel
        Promise.all(Array.from({ length: 3 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            return createSessionLink(date);
        })).then(sessionElements => {
            loadingIndicator.remove();
            const validSessions = sessionElements.filter(Boolean);
            
            if (validSessions.length > 0) {
                validSessions.forEach(element => sessionList.appendChild(element));
                sessionStatus.style.display = 'none';
            } else {
                sessionStatus.style.display = 'block';
                sessionStatus.textContent = 'No recent sessions found';
            }

            // Update timestamps
            updateFooterTimestamps();
        });
    }

    function updateFooterTimestamps() {
        const elements = {
            lastUpdate: document.getElementById('lastSessionUpdate'),
            footerTimestamp: document.getElementById('footerTimestamp')
        };

        const timestamp = formatDateTime(new Date());
        Object.values(elements).forEach(element => {
            if (element) element.textContent = timestamp;
        });
    }

    // Initialize all footer components
    function initializeFooter() {
        updateSessionLinks();
        updateTaskStatistics();
        setupFooterInteractions();
    }

    function setupFooterInteractions() {
        // Add hover effects for session links
        document.querySelectorAll('.session-link').forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.querySelector('.session-indicator').style.opacity = '1';
            });
            link.addEventListener('mouseleave', () => {
                link.querySelector('.session-indicator').style.opacity = '0.5';
            });
        });
    }

    // Initial setup
    initializeFooter();

    // Periodic updates
    setInterval(initializeFooter, 3600000); // Update every hour
});