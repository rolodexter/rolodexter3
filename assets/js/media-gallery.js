class MediaGallery {
    constructor() {
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.mediaData = null;
        this.loadingState = false;
        this.retryAttempts = 3;
        this.init();
    }

    async init() {
        try {
            await this.loadMediaData();
            this.setupEventListeners();
            this.render();
        } catch (error) {
            this.handleError('Failed to initialize gallery');
        }
    }

    async loadMediaData() {
        this.setLoading(true);
        try {
            const response = await fetch('/assets/data/media-gallery.json');
            if (!response.ok) throw new Error('Failed to load media data');
            
            this.mediaData = await response.json();
            this.setupPagination();
        } catch (error) {
            throw new Error('Error loading media data');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(state) {
        this.loadingState = state;
        const gallery = document.querySelector('.gallery-grid');
        if (state) {
            gallery.classList.add('loading');
        } else {
            gallery.classList.remove('loading');
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.gallery-filter').forEach(button => {
            button.addEventListener('click', () => {
                this.currentFilter = button.dataset.filter;
                this.currentPage = 1;
                this.render();
                this.updateURL();
            });
        });

        // Pagination
        document.querySelector('.page-prev').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
                this.updateURL();
            }
        });

        document.querySelector('.page-next').addEventListener('click', () => {
            const maxPages = this.getMaxPages();
            if (this.currentPage < maxPages) {
                this.currentPage++;
                this.render();
                this.updateURL();
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state) {
                this.currentFilter = event.state.filter;
                this.currentPage = event.state.page;
                this.render();
            }
        });
    }

    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('filter', this.currentFilter);
        url.searchParams.set('page', this.currentPage);
        window.history.pushState(
            { filter: this.currentFilter, page: this.currentPage },
            '',
            url
        );
    }

    getFilteredItems() {
        if (!this.mediaData) return [];
        
        const allItems = [
            ...this.mediaData.media.images,
            ...this.mediaData.media.videos,
            ...this.mediaData.media.documents
        ];

        return this.currentFilter === 'all'
            ? allItems
            : allItems.filter(item => {
                const itemType = this.getItemType(item);
                return itemType === this.currentFilter;
              });
    }

    getItemType(item) {
        if (item.url.match(/\.(jpg|jpeg|png|gif)$/i)) return 'images';
        if (item.url.match(/\.(mp4|webm|ogg)$/i)) return 'videos';
        return 'documents';
    }

    getMaxPages() {
        const filteredItems = this.getFilteredItems();
        return Math.ceil(filteredItems.length / this.mediaData.pagination.itemsPerPage);
    }

    setupPagination() {
        const totalItems = this.getFilteredItems().length;
        const maxPages = Math.ceil(totalItems / this.mediaData.pagination.itemsPerPage);
        
        document.querySelector('.page-info').innerHTML = `
            Page <span class="current-page">${this.currentPage}</span> of ${maxPages}
        `;
    }

    render() {
        if (!this.mediaData) return;

        const grid = document.querySelector('.gallery-grid');
        const filteredItems = this.getFilteredItems();
        const start = (this.currentPage - 1) * this.mediaData.pagination.itemsPerPage;
        const end = start + this.mediaData.pagination.itemsPerPage;
        const currentItems = filteredItems.slice(start, end);

        grid.innerHTML = currentItems.map(item => this.renderItem(item)).join('');
        
        this.setupPagination();
        this.updateFilterStates();
        this.initializeLazyLoading();
    }

    renderItem(item) {
        const itemType = this.getItemType(item);
        const template = this.getItemTemplate(item, itemType);
        
        return `
            <div class="gallery-item" data-type="${itemType}">
                ${template}
                <div class="item-overlay">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <div class="item-tags">
                        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>`;
    }

    getItemTemplate(item, type) {
        switch (type) {
            case 'images':
                return `
                    <img 
                        src="${item.thumbnail}" 
                        data-src="${item.url}" 
                        alt="${item.title}"
                        loading="lazy"
                        class="lazy"
                    >`;
            case 'videos':
                return `
                    <video 
                        src="${item.url}"
                        poster="${item.thumbnail}"
                        controls
                    ></video>
                    <span class="duration">${item.duration}</span>`;
            case 'documents':
                return `
                    <div class="document-preview">
                        <i class="document-icon"></i>
                        <span class="document-type">${item.type.toUpperCase()}</span>
                        <span class="document-size">${item.size}</span>
                    </div>`;
        }
    }

    updateFilterStates() {
        document.querySelectorAll('.gallery-filter').forEach(button => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });
    }

    initializeLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    handleError(message) {
        const gallery = document.querySelector('.gallery-grid');
        gallery.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>`;
    }
}

// Initialize gallery with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.mediaGallery = new MediaGallery();
    } catch (error) {
        console.error('Failed to initialize media gallery:', error);
    }
});