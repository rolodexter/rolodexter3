// Mobile Menu Touch & Gesture Handler
export class MobileMenuHandler {
    constructor(menuElement, toggleButton, options = {}) {
        this.menu = menuElement;
        this.toggleButton = toggleButton;
        this.options = {
            swipeThreshold: 50,
            preventScroll: true,
            animationDuration: 300,
            ...options
        };

        // Touch tracking state
        this.touchStart = null;
        this.touchMove = null;
        this.isOpen = false;
        this.isSwiping = false;
        this.startTime = 0;

        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);

        // Initialize
        this.init();
    }

    init() {
        // Add touch event listeners
        this.menu.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.menu.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.menu.addEventListener('touchend', this.handleTouchEnd);

        // Click outside detection
        document.addEventListener('click', this.handleClickOutside);

        // Prevent body scroll when menu is open
        if (this.options.preventScroll) {
            this.menu.addEventListener('touchmove', (e) => {
                if (this.isOpen && !this.isSwiping) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }

    handleTouchStart(e) {
        this.touchStart = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        this.startTime = Date.now();
        this.isSwiping = false;
    }

    handleTouchMove(e) {
        if (!this.touchStart) return;

        this.touchMove = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };

        const deltaX = this.touchStart.x - this.touchMove.x;
        const deltaY = this.touchStart.y - this.touchMove.y;

        // Determine if horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            this.isSwiping = true;
            e.preventDefault();

            // Calculate swipe percentage
            const swipePercentage = Math.min(Math.max(deltaX / window.innerWidth, 0), 1);
            
            // Apply transform based on swipe direction
            if (this.isOpen && deltaX > 0) {
                this.menu.style.transform = `translateX(-${swipePercentage * 100}%)`;
            } else if (!this.isOpen && deltaX < 0) {
                this.menu.style.transform = `translateX(${(1 - swipePercentage) * -100}%)`;
            }
        }
    }

    handleTouchEnd() {
        if (!this.touchStart || !this.touchMove) {
            this.resetTouchState();
            return;
        }

        const deltaX = this.touchStart.x - this.touchMove.x;
        const deltaTime = Date.now() - this.startTime;
        const velocity = Math.abs(deltaX) / deltaTime;

        // Determine if swipe was fast enough or passed threshold
        const isFastSwipe = velocity > 0.5;
        const isSignificantSwipe = Math.abs(deltaX) > this.options.swipeThreshold;

        if (this.isSwiping && (isFastSwipe || isSignificantSwipe)) {
            if ((this.isOpen && deltaX > 0) || (!this.isOpen && deltaX < 0)) {
                this.toggleMenu();
            } else {
                this.resetMenuPosition();
            }
        } else {
            this.resetMenuPosition();
        }

        this.resetTouchState();
    }

    handleClickOutside(e) {
        if (this.isOpen && !this.menu.contains(e.target) && !this.toggleButton.contains(e.target)) {
            this.closeMenu();
        }
    }

    toggleMenu() {
        this.isOpen = !this.isOpen;
        this.menu.style.transform = this.isOpen ? 'translateX(0)' : 'translateX(-100%)';
        this.menu.classList.toggle('active', this.isOpen);
        document.body.style.overflow = this.isOpen && this.options.preventScroll ? 'hidden' : '';
        
        // Dispatch custom event
        this.menu.dispatchEvent(new CustomEvent('menuStateChange', {
            detail: { isOpen: this.isOpen }
        }));
    }

    closeMenu() {
        if (this.isOpen) {
            this.isOpen = false;
            this.menu.style.transform = 'translateX(-100%)';
            this.menu.classList.remove('active');
            document.body.style.overflow = '';

            // Dispatch custom event
            this.menu.dispatchEvent(new CustomEvent('menuStateChange', {
                detail: { isOpen: false }
            }));
        }
    }

    resetMenuPosition() {
        this.menu.style.transform = this.isOpen ? 'translateX(0)' : 'translateX(-100%)';
    }

    resetTouchState() {
        this.touchStart = null;
        this.touchMove = null;
        this.isSwiping = false;
    }

    destroy() {
        // Remove event listeners
        this.menu.removeEventListener('touchstart', this.handleTouchStart);
        this.menu.removeEventListener('touchmove', this.handleTouchMove);
        this.menu.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('click', this.handleClickOutside);
    }
} 