// Task loading and display functionality
async function loadRecentTasks() {
    try {
        const response = await fetch('/assets/data/tasks.json');
        const tasks = await response.json();
        
        updatePendingTasks(tasks.pending);
        updateResolvedTasks(tasks.resolved);
        updateLastUpdated(tasks.lastUpdated);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showErrorState();
    }
}

function updatePendingTasks(pendingTasks) {
    const pendingList = document.getElementById('pending-tasks-list');
    if (!pendingList) return;

    pendingList.innerHTML = pendingTasks
        .slice(0, 3)
        .map(task => `
            <li class="task-item ${task.priority}-priority ${task.status}">
                <div class="task-header">
                    <h4><a href="${task.link}">${task.title}</a></h4>
                    <span class="status-badge ${task.status}">${task.status}</span>
                </div>
                <p class="task-details">${task.details}</p>
                <div class="task-meta">
                    <span class="agent">👤 ${task.agent}</span>
                    <span class="updated">🕒 ${formatDate(task.lastUpdated)}</span>
                </div>
            </li>
        `)
        .join('');
}

function updateResolvedTasks(resolvedTasks) {
    const resolvedList = document.getElementById('resolved-tasks-list');
    if (!resolvedList) return;

    resolvedList.innerHTML = resolvedTasks
        .slice(0, 5)
        .map(task => `
            <li class="task-item resolved">
                <div class="task-header">
                    <h4><a href="${task.link}">${task.title}</a></h4>
                    <span class="completion-date">✅ ${formatDate(task.completedAt)}</span>
                </div>
                <p class="task-details">${task.details}</p>
                <div class="task-meta">
                    <span class="agent">👤 ${task.agent}</span>
                </div>
            </li>
        `)
        .join('');
}

function updateLastUpdated(lastUpdated) {
    const lastUpdatedEl = document.getElementById('tasks-last-updated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Last updated: ${formatDate(lastUpdated)}`;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function showErrorState() {
    const taskSections = document.querySelectorAll('#pending-tasks-list, #resolved-tasks-list');
    taskSections.forEach(section => {
        if (section) {
            section.innerHTML = `
                <li class="task-item error">
                    <p>Unable to load tasks. Please try again later.</p>
                </li>
            `;
        }
    });
}

// Initialize tasks on page load
document.addEventListener('DOMContentLoaded', loadRecentTasks);

// Refresh tasks every 5 minutes
setInterval(loadRecentTasks, 300000); 