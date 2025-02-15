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
            console.error('Failed to initialize media gallery:', error);
            this.galleryGrid.innerHTML = '<p class="error">Failed to load media gallery</p>';
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

    render() {
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
    }

    renderItem(item) {
        return `
            <div class="gallery-item" data-type="${item.type}">
                <div class="item-thumbnail">
                    <img src="${item.thumbnail}" alt="${item.title}" loading="lazy">
                </div>
                <div class="item-info">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <div class="item-tags">
                        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MediaGallery();
});