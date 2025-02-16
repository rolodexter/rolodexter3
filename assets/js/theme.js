// Theme handling
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme-preference', theme);
    updateThemeToggleIcons(theme);
    updateLogos(theme);
}

function updateThemeToggleIcons(theme) {
    const sunIcon = document.querySelector('.theme-toggle .sun');
    const moonIcon = document.querySelector('.theme-toggle .moon');
    
    if (!sunIcon || !moonIcon) {
        console.warn('Theme toggle icons not found');
        return;
    }

    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

function updateLogos(theme) {
    const logos = document.querySelectorAll('.site-logo');
    
    if (!logos.length) {
        console.warn('No logo elements found');
        return;
    }

    logos.forEach(logo => {
        const darkSrc = logo.getAttribute('data-dark-src');
        const lightSrc = logo.getAttribute('data-light-src');
        
        if (!darkSrc || !lightSrc) {
            console.warn('Logo is missing data-dark-src or data-light-src attributes:', logo);
            return;
        }

        // Add transition class
        logo.classList.add('switching');
        
        // Update src after a brief delay for transition
        setTimeout(() => {
            try {
                logo.src = theme === 'dark' ? darkSrc : lightSrc;
                logo.classList.remove('switching');
            } catch (error) {
                console.error('Error updating logo src:', error);
            }
        }, 150);
    });
}

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme-preference');
    const initialTheme = savedTheme || getSystemTheme();
    setTheme(initialTheme);
}

// Listen for system theme changes
function setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme-preference')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// Theme toggle functionality
function setupThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeTheme();
        setupSystemThemeListener();
        setupThemeToggle();
    } catch (error) {
        console.error('Error initializing theme system:', error);
    }
}); 