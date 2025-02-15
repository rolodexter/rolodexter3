// Add smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', () => {
    console.log('Website loaded successfully!');
});

// Glitch Text Effect
function createGlitchEffect(element) {
    const text = element.textContent;
    let glitchInterval;

    element.addEventListener('mouseover', () => {
        let counter = 0;
        glitchInterval = setInterval(() => {
            element.textContent = text.split('').map((char, index) => {
                if (index < counter) return char;
                return String.fromCharCode(Math.floor(Math.random() * (126 - 33 + 1)) + 33);
            }).join('');
            
            counter++;
            if (counter > text.length) {
                clearInterval(glitchInterval);
                element.textContent = text;
            }
        }, 50);
    });
}

// Data Flow Animation
function initDataFlowElements() {
    const dataFlowElements = document.querySelectorAll('.data-flow');
    dataFlowElements.forEach(element => {
        const dataString = '01'.repeat(20);
        const overlay = document.createElement('div');
        overlay.className = 'data-overlay';
        overlay.textContent = dataString;
        element.appendChild(overlay);
    });
}

// Holographic Card Effect
function initHoloCards() {
    const cards = document.querySelectorAll('.holo-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const angleX = (y - centerY) / 30;
            const angleY = (centerX - x) / 30;
            
            card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
            card.style.background = `linear-gradient(${x/rect.width * 360}deg, var(--dark-graphite), var(--dimmed-carbon))`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            card.style.background = 'var(--dark-graphite)';
        });
    });
}

// Matrix Rain Effect
function createMatrixRain() {
    const matrixBg = document.createElement('div');
    matrixBg.className = 'matrix-bg';
    document.body.appendChild(matrixBg);

    // Create columns
    for (let i = 0; i < window.innerWidth / 20; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.left = `${i * 20}px`;
        column.style.animationDelay = `${Math.random() * 20}s`;
        matrixBg.appendChild(column);
    }
}

// Neural Network Loading Animation
function createNeuralLoader(container) {
    const loader = document.createElement('div');
    loader.className = 'neural-loader';

    // Create nodes
    for (let i = 0; i < 4; i++) {
        const node = document.createElement('div');
        node.className = 'neural-node';
        node.style.left = `${Math.cos(i * Math.PI / 2) * 20 + 25}px`;
        node.style.top = `${Math.sin(i * Math.PI / 2) * 20 + 25}px`;
        node.style.animationDelay = `${i * 0.2}s`;
        loader.appendChild(node);

        // Create connections
        const connection = document.createElement('div');
        connection.className = 'neural-connection';
        connection.style.transform = `rotate(${i * 90}deg)`;
        connection.style.animationDelay = `${i * 0.2}s`;
        loader.appendChild(connection);
    }

    container.appendChild(loader);
}

// Loading State Manager
class LoadingStateManager {
    static setLoading(element, isLoading) {
        if (isLoading) {
            element.classList.add('loading');
            const loader = document.createElement('div');
            loader.className = 'neural-loader';
            createNeuralLoader(loader);
            element.appendChild(loader);
        } else {
            element.classList.remove('loading');
            const loader = element.querySelector('.neural-loader');
            if (loader) loader.remove();
        }
    }

    static async loadContent(element, loadingPromise) {
        this.setLoading(element, true);
        try {
            await loadingPromise;
        } finally {
            this.setLoading(element, false);
        }
    }
}

// Add cookie consent functionality
class CookieConsent {
    constructor() {
        this.cookieName = 'rolodexter_cookie_consent';
        this.consentBanner = null;
        this.init();
    }

    init() {
        if (!this.hasConsent()) {
            this.showBanner();
        }
    }

    hasConsent() {
        return localStorage.getItem(this.cookieName) === 'true';
    }

    setConsent(accepted) {
        localStorage.setItem(this.cookieName, accepted);
        if (this.consentBanner) {
            this.consentBanner.classList.remove('visible');
            setTimeout(() => {
                this.consentBanner.remove();
                this.consentBanner = null;
            }, 300); // Match the transition duration from CSS
        }
        // Trigger event for analytics
        const event = new CustomEvent('cookieConsentUpdate', { detail: { accepted } });
        document.dispatchEvent(event);
    }

    showBanner() {
        // Remove any existing banner first
        const existingBanner = document.querySelector('.cookie-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.className = 'cookie-banner holo-card';
        banner.innerHTML = `
            <div class="cookie-content">
                <p>We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.</p>
                <div class="cookie-buttons">
                    <button class="accept-btn">Accept All</button>
                    <button class="reject-btn">Reject Non-Essential</button>
                    <a href="/legal/cookies.html" class="cookie-link">Learn More</a>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
        this.consentBanner = banner;

        // Add event listeners
        const acceptBtn = banner.querySelector('.accept-btn');
        const rejectBtn = banner.querySelector('.reject-btn');

        acceptBtn.addEventListener('click', () => {
            this.setConsent(true);
        });

        rejectBtn.addEventListener('click', () => {
            this.setConsent(false);
        });

        // Add animation after a small delay to ensure transition works
        requestAnimationFrame(() => {
            banner.classList.add('visible');
        });
    }
}

// Mobile Menu Toggle
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Add glitch effect on toggle
            const glitchDuration = 300;
            menuToggle.style.animation = `glitch ${glitchDuration}ms cubic-bezier(.25, .46, .45, .94)`;
            
            setTimeout(() => {
                menuToggle.style.animation = '';
            }, glitchDuration);
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
}

// Theme Management
const themeToggle = document.querySelector('.theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Initialize theme from localStorage or system preference
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        const theme = prefersDarkScheme.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// Toggle theme function
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Event Listeners
themeToggle?.addEventListener('click', toggleTheme);
prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});

// Initialize theme on load
initializeTheme();

// Update session history in memory system
async function updateSessionHistory() {
    try {
        const response = await fetch('/memory/update-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'theme_toggle',
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.error('Failed to update session history');
        }
    } catch (error) {
        console.error('Error updating session history:', error);
    }
}

// Initialize effects when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize glitch effects on headings
    document.querySelectorAll('.glitch-effect').forEach(createGlitchEffect);
    
    // Initialize data flow animations
    initDataFlowElements();
    
    // Initialize holographic card effects
    initHoloCards();
    
    // Initialize matrix rain effect
    createMatrixRain();
    
    // Add loading states to dynamic content sections
    document.querySelectorAll('.holo-card').forEach(card => {
        card.addEventListener('click', async () => {
            await LoadingStateManager.loadContent(card, new Promise(resolve => setTimeout(resolve, 2000)));
        });
    });

    // Initialize cookie consent
    new CookieConsent();

    console.log('ROLODEXTER interface initialized with cyberpunk effects');
    
    // Mobile Navigation
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    menuToggle?.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', 
            menuToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
        );
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-links') && !e.target.closest('.menu-toggle')) {
            navLinks.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navLinks.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    });
});