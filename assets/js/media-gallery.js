class MediaGalleryMonitor {
    constructor() {
        this.performanceMetrics = {
            renderTimes: [],
            imageLoadTimes: [],
            filterOperationTimes: [],
            mediaErrors: []
        };
        this.observe();
    }

    observe() {
        // Performance observer for timing metrics
        this.observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.logMetric(entry);
            }
        });

        this.observer.observe({ entryTypes: ['measure', 'resource'] });

        // Intersection observer for visibility tracking
        this.visibilityObserver = new IntersectionObserver(
            (entries) => this.handleVisibility(entries),
            { threshold: 0.1 }
        );
    }

    logMetric(entry) {
        const metrics = {
            timestamp: Date.now(),
            type: entry.entryType,
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize || 0,
            contentType: entry.initiatorType || ''
        };

        // Calculate CLS if available
        if (entry.hadRecentInput === false) {
            metrics.cls = entry.value;
        }

        // Log to debug file
        this.logToDebug('PERFORMANCE', metrics);
    }

    handleVisibility(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.logMetric({
                    entryType: 'visibility',
                    name: entry.target.getAttribute('data-item-id'),
                    duration: entry.intersectionRatio
                });
            }
        });
    }

    async logToDebug(type, data) {
        try {
            const debugEntry = {
                timestamp: new Date().toISOString(),
                type,
                data
            };

            await fetch('/api/debug/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(debugEntry)
            });
        } catch (error) {
            console.error('Failed to log debug entry:', error);
        }
    }

    logError(error) {
        this.performanceMetrics.mediaErrors.push({
            timestamp: Date.now(),
            error: error.message,
            stack: error.stack
        });
        this.logToDebug('ERROR', error);
    }
}

// Enhance existing MediaGallery class
class MediaGallery {
    constructor() {
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.itemsPerPage = 12;
        this.mediaItems = [];
        
        // Initialize elements
        this.galleryGrid = document.querySelector('.gallery-grid');
        this.filterButtons = document.querySelectorAll('.gallery-filter');
        this.prevButton = document.querySelector('.page-prev');
        this.nextButton = document.querySelector('.page-next');
        this.currentPageSpan = document.querySelector('.current-page');
        
        this.monitor = new MediaGalleryMonitor();
        this.setupPerformanceMonitoring();
        
        this.imageSizes = {
            thumbnail: { width: 300, height: 200 },
            preview: { width: 100, height: 100 }
        };
        this.initialize();
    }

    async initialize() {
        try {
            // Load media data
            const response = await fetch('/assets/data/media-gallery.json');
            const data = await response.json();
            this.mediaItems = data.mediaItems;
            this.itemsPerPage = data.pagination.itemsPerPage;
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initial render
            this.render();
        } catch (error) {
            this.handleError(error);
        }
    }

    setupEventListeners() {
        // Filter buttons
        this.filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.currentFilter = button.dataset.filter;
                this.currentPage = 1;
                this.updateActiveFilter();
                this.render();
            });
        });

        // Pagination
        this.prevButton.addEventListener('click', () => this.changePage(-1));
        this.nextButton.addEventListener('click', () => this.changePage(1));
    }

    getFilteredItems() {
        if (this.currentFilter === 'all') {
            return this.mediaItems;
        }
        return this.mediaItems.filter(item => item.type === this.currentFilter);
    }

    updateActiveFilter() {
        this.filterButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });
    }

    changePage(delta) {
        const filteredItems = this.getFilteredItems();
        const maxPage = Math.ceil(filteredItems.length / this.itemsPerPage);
        
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= maxPage) {
            this.currentPage = newPage;
            this.render();
        }
    }

    setupPerformanceMonitoring() {
        // Mark render start
        performance.mark('renderStart');

        // Monitor image loading
        document.addEventListener('load', (event) => {
            if (event.target.tagName === 'IMG') {
                performance.measure('imageLoad', 'renderStart');
            }
        }, true);

        // Monitor filter operations
        this.filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                performance.mark('filterStart');
                // ...existing filter code...
                performance.measure('filterOperation', 'filterStart');
            });
        });

        // Monitor responsive behavior
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.monitor.logMetric({
                    entryType: 'resize',
                    name: 'galleryResize',
                    duration: entry.contentRect.width
                });
            }
        });
        this.resizeObserver.observe(this.galleryGrid);
    }

    render() {
        performance.mark('renderStart');
        const filteredItems = this.getFilteredItems();
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const itemsToShow = filteredItems.slice(startIndex, endIndex);

        // Update pagination UI
        const maxPage = Math.ceil(filteredItems.length / this.itemsPerPage);
        this.prevButton.disabled = this.currentPage === 1;
        this.nextButton.disabled = this.currentPage === maxPage;
        this.currentPageSpan.textContent = this.currentPage;

        // Render items
        this.galleryGrid.innerHTML = itemsToShow.map(item => this.renderItem(item)).join('');
        performance.measure('galleryRender', 'renderStart');
    }

    renderItem(item) {
        const placeholderColor = item.averageColor || '#222';
        return `
            <div class="gallery-item" data-type="${item.type}">
                <div class="item-thumbnail" style="background-color: ${placeholderColor}">
                    <img 
                        src="${item.thumbnail}" 
                        alt="${item.title}" 
                        loading="lazy"
                        srcset="${this.generateSrcSet(item)}"
                        sizes="(max-width: 768px) 100vw, 300px"
                        style="opacity: 0; transition: opacity 0.3s"
                        onload="this.style.opacity = 1"
                        onerror="this.parentElement.classList.add('error')"
                    >
                </div>
                <div class="item-info">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <div class="item-metadata">
                        <span class="item-date">${new Date(item.date).toLocaleDateString()}</span>
                        <span class="item-size">${this.formatFileSize(item.size)}</span>
                    </div>
                    <div class="item-tags">
                        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    generateSrcSet(item) {
        const sizes = [300, 600, 900];
        return sizes
            .map(size => `${item.url.replace('.', `_${size}.`)} ${size}w`)
            .join(', ');
    }

    formatFileSize(bytes) {
        if (!bytes) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    handleError(error) {
        this.monitor.logError(error);
        this.galleryGrid.innerHTML = '<p class="error">An error occurred while loading the gallery</p>';
    }
}

// Initialize with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        new MediaGallery();
    } catch (error) {
        console.error('Failed to initialize media gallery:', error);
        document.querySelector('.media-gallery').innerHTML = 
            '<p class="error">Failed to initialize media gallery</p>';
    }
});