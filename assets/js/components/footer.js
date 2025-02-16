// Footer initialization and dynamic session links handler
document.addEventListener("DOMContentLoaded", function () {
    // Utility functions
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatDisplayDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };
    const formatDateTime = (date) => date.toISOString().replace('T', ' ').slice(0, -5) + ' UTC';

    // Update session links in footer
    function updateSessionLinks() {
        const sessionList = document.querySelector('.session-links');
        const sessionStatus = document.querySelector('.session-status');
        const lastUpdateSpan = document.getElementById('lastSessionUpdate');
        const today = new Date();
        let hasValidSessions = false;

        // Clear existing links
        if (sessionList) {
            sessionList.innerHTML = '';

            // Generate links for the last three days
            for (let i = 0; i < 3; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const formattedDate = formatDate(date);
                const displayDate = formatDisplayDate(date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                
                const sessionURL = `/memory/rolodexterVS/memories/sessions/${year}/${month}/${day}.html`;
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                
                link.href = sessionURL;
                link.innerHTML = `📝 ${displayDate}`;
                link.setAttribute('data-session-date', formattedDate);
                
                // Validate session existence
                fetch(sessionURL, { method: 'HEAD' })
                    .then(response => {
                        if (response.ok) {
                            hasValidSessions = true;
                            listItem.appendChild(link);
                            sessionList.appendChild(listItem);
                            sessionStatus.style.display = 'none';
                        }
                    })
                    .catch(() => {
                        if (!hasValidSessions && i === 2) {
                            sessionStatus.style.display = 'block';
                        }
                    });
            }

            // Update timestamps
            if (lastUpdateSpan) {
                lastUpdateSpan.textContent = formatDateTime(new Date());
            }
            const footerTimestamp = document.getElementById('footerTimestamp');
            if (footerTimestamp) {
                footerTimestamp.textContent = formatDateTime(new Date());
            }
        }
    }

    // Initial update
    updateSessionLinks();

    // Update session links every hour
    setInterval(updateSessionLinks, 3600000);
});