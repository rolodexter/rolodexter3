// Theme handling
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme-preference', theme);
    updateThemeToggleIcons(theme);
}

function updateThemeToggleIcons(theme) {
    const sunIcon = document.querySelector('.theme-toggle .sun');
    const moonIcon = document.querySelector('.theme-toggle .moon');
    const logos = document.querySelectorAll('.site-logo');
    
    if (!sunIcon || !moonIcon) return; // Skip if icons don't exist

    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        logos.forEach(logo => {
            logo.classList.add('switching');
            setTimeout(() => {
                logo.src = logo.dataset.darkSrc;
                logo.classList.remove('switching');
            }, 150);
        });
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        logos.forEach(logo => {
            logo.classList.add('switching');
            setTimeout(() => {
                logo.src = logo.dataset.lightSrc;
                logo.classList.remove('switching');
            }, 150);
        });
    }
}

// Initialize theme
const savedTheme = localStorage.getItem('theme-preference');
const initialTheme = savedTheme || getSystemTheme();
setTheme(initialTheme);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme-preference')) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }
}); 