// Theme handling and utilities
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setTheme(theme, isAutoMode = false) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-mode', isAutoMode ? 'auto' : 'manual');
    if (!isAutoMode) {
        localStorage.setItem('theme-preference', theme);
        localStorage.setItem('theme-mode', 'manual');
    } else {
        localStorage.removeItem('theme-preference');
        localStorage.setItem('theme-mode', 'auto');
    }
    updateThemeToggleIcons(theme, isAutoMode);
    updateLogos(theme);
}

function updateThemeToggleIcons(theme, isAutoMode) {
    const sunIcon = document.querySelector('.theme-toggle .sun');
    const moonIcon = document.querySelector('.theme-toggle .moon');
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (!sunIcon || !moonIcon || !themeToggle) {
        console.warn('Theme toggle elements not found');
        return;
    }

    // Update aria-label based on current state
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme (currently ${theme}${isAutoMode ? ', auto-mode' : ''})`);

    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

function handleLogoError(logo) {
    console.warn('Logo failed to load, attempting fallback...', logo.src);
    const fallbackSrc = './assets/brand/logos/primary/SQUARE_LOGO.jpg';
    if (logo.src !== fallbackSrc) {
        logo.src = fallbackSrc;
    }
}

function updateLogos(theme) {
    const logos = document.querySelectorAll('.site-logo');
    
    if (!logos.length) {
        console.warn('No logo elements found');
        return;
    }

    const reducedMotion = prefersReducedMotion();
    const transitionDuration = reducedMotion ? 0 : 150;

    logos.forEach(logo => {
        const darkSrc = logo.getAttribute('data-dark-src');
        const lightSrc = logo.getAttribute('data-light-src');
        
        if (!darkSrc || !lightSrc) {
            console.warn('Logo is missing data-dark-src or data-light-src attributes:', logo);
            return;
        }

        // Remove old error listener if it exists
        logo.removeEventListener('error', () => handleLogoError(logo));
        // Add new error listener for fallback
        logo.addEventListener('error', () => handleLogoError(logo));

        // Add transition class if animations are enabled
        if (!reducedMotion) {
            logo.classList.add('switching');
        }
        
        // Update src with or without transition
        setTimeout(() => {
            try {
                logo.src = theme === 'dark' ? darkSrc : lightSrc;
                if (!reducedMotion) {
                    logo.classList.remove('switching');
                }
            } catch (error) {
                console.error('Error updating logo src:', error);
                handleLogoError(logo);
            }
        }, transitionDuration);

        // Update responsive attributes
        logo.setAttribute('sizes', '(max-width: 768px) 150px, 200px');
    });
}

// Initialize theme
function initializeTheme() {
    const savedThemeMode = localStorage.getItem('theme-mode') || 'auto';
    const savedTheme = localStorage.getItem('theme-preference');
    
    if (savedThemeMode === 'auto' || !savedTheme) {
        setTheme(getSystemTheme(), true);
    } else {
        setTheme(savedTheme, false);
    }
}

// Listen for system theme changes
function setupSystemThemeListener() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    darkModeMediaQuery.addEventListener('change', (e) => {
        if (localStorage.getItem('theme-mode') === 'auto') {
            setTheme(e.matches ? 'dark' : 'light', true);
        }
    });

    motionMediaQuery.addEventListener('change', () => {
        // Reapply current theme to update transitions
        const currentTheme = document.documentElement.getAttribute('data-theme');
        updateLogos(currentTheme);
    });
}

// Theme toggle functionality
function setupThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }

    // Double-click handler for auto mode
    let clickTimeout = null;
    
    themeToggle.addEventListener('click', () => {
        if (clickTimeout === null) {
            clickTimeout = setTimeout(() => {
                // Single click - toggle theme
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                setTheme(newTheme, false);
                clickTimeout = null;
            }, 250);
        } else {
            // Double click - toggle auto mode
            clearTimeout(clickTimeout);
            clickTimeout = null;
            const isCurrentlyAuto = localStorage.getItem('theme-mode') === 'auto';
            if (isCurrentlyAuto) {
                // Switch to manual mode with current system theme
                setTheme(getSystemTheme(), false);
            } else {
                // Switch to auto mode
                setTheme(getSystemTheme(), true);
            }
        }
    });

    // Add tooltip for instructions
    themeToggle.setAttribute('title', 'Click to toggle theme, double-click for auto mode');
}

// Debug mode for development
const DEBUG = false;
function log(...args) {
    if (DEBUG) {
        console.log('[Theme System]:', ...args);
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        log('Initializing theme system...');
        initializeTheme();
        setupSystemThemeListener();
        setupThemeToggle();
        log('Theme system initialized successfully');
    } catch (error) {
        console.error('Error initializing theme system:', error);
    }
}); 