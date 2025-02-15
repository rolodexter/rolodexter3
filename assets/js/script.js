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

// Initialize effects when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
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

    console.log('ROLODEXTER interface initialized with cyberpunk effects');
});