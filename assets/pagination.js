/**
 * Advanced Pagination functionality for collection pages
 * Supports: Traditional Pagination, Load More, and Infinite Scroll
 */
class AdvancedPagination {
  constructor() {
    this.paginationWrapper = document.querySelector('.pagination-wrapper');
    this.paginationType = this.paginationWrapper?.dataset.paginationType || 'traditional';
    this.currentPage = parseInt(this.paginationWrapper?.dataset.currentPage) || 1;
    this.totalPages = parseInt(this.paginationWrapper?.dataset.totalPages) || 1;
    this.loadedPages = new Set([this.currentPage]);
    this.isLoading = false;
    this.sectionId = this.getSectionId();
    
    this.init();
  }

  init() {
    if (!this.paginationWrapper) return;

    switch (this.paginationType) {
      case 'traditional':
        this.initTraditionalPagination();
        break;
      case 'load_more':
        this.initLoadMorePagination();
        break;
      case 'infinite_scroll':
        this.initInfiniteScroll();
        break;
    }
  }

  /**
   * Initialize traditional pagination
   */
  initTraditionalPagination() {
    document.addEventListener('click', this.handleTraditionalClick.bind(this));
  }

  /**
   * Initialize load more pagination
   */
  initLoadMorePagination() {
    const loadMoreBtn = document.querySelector('.pagination__load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', this.handleLoadMore.bind(this));
    }
  }

  /**
   * Initialize infinite scroll
   */
  initInfiniteScroll() {
    const nextMarker = document.querySelector('.pagination__infinite-marker--next');
    if (nextMarker) {
      this.createIntersectionObserver();
    }
  }

  /**
   * Handle traditional pagination clicks
   */
  handleTraditionalClick(event) {
    const paginationLink = event.target.closest('.pagination__link');
    
    if (!paginationLink) return;

    // Don't handle current page clicks
    if (paginationLink.classList.contains('pagination__link--current')) {
      event.preventDefault();
      return;
    }

    // Add loading state
    this.showLoadingState(true);

    // Smooth scroll to top of results after a short delay
    setTimeout(() => {
      this.scrollToResults();
    }, 100);
  }

  /**
   * Handle load more button click
   */
  async handleLoadMore(event) {
    const button = event.target.closest('.pagination__load-more-btn');
    const nextUrl = button?.dataset.nextUrl;
    
    if (!nextUrl || this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadMoreLoading(true);
    
    try {
      const response = await fetch(nextUrl + '&section_id=' + this.sectionId);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Get new products
      const newProducts = doc.querySelectorAll('.product-grid__item');
      const productGrid = document.querySelector('.product-grid');
      
      if (productGrid && newProducts.length) {
        // Add new products with animation
        newProducts.forEach((product, index) => {
          setTimeout(() => {
            product.style.opacity = '0';
            product.style.transform = 'translateY(20px)';
            productGrid.appendChild(product);
            
            // Animate in
            requestAnimationFrame(() => {
              product.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
              product.style.opacity = '1';
              product.style.transform = 'translateY(0)';
            });
          }, index * 50);
        });
        
        // Update button or hide if no more pages
        const newPaginationWrapper = doc.querySelector('.pagination-wrapper');
        const newLoadMoreBtn = newPaginationWrapper?.querySelector('.pagination__load-more-btn');
        
        if (newLoadMoreBtn) {
          button.dataset.nextUrl = newLoadMoreBtn.dataset.nextUrl;
          this.currentPage++;
        } else {
          // No more pages, hide button
          button.parentElement.style.display = 'none';
        }
        
        // Update pagination info
        this.updatePaginationInfo(doc);
        
        // Update URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('page', this.currentPage);
        this.updateURL(newUrl.toString());
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      this.isLoading = false;
      this.showLoadMoreLoading(false);
    }
  }

  /**
   * Create intersection observer for infinite scroll
   */
  createIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isLoading) {
            if (entry.target.classList.contains('pagination__infinite-marker--next')) {
              this.loadNextPage();
            }
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    const markers = document.querySelectorAll('.pagination__infinite-marker');
    markers.forEach(marker => this.observer.observe(marker));
  }

  /**
   * Load next page for infinite scroll
   */
  async loadNextPage() {
    const nextMarker = document.querySelector('.pagination__infinite-marker--next');
    const nextUrl = nextMarker?.dataset.url;
    
    if (!nextUrl || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const response = await fetch(nextUrl + '&section_id=' + this.sectionId);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Get new products
      const newProducts = doc.querySelectorAll('.product-grid__item');
      const productGrid = document.querySelector('.product-grid');
      
      if (productGrid && newProducts.length) {
        // Remove old marker
        nextMarker.remove();
        
        // Add new products
        newProducts.forEach(product => {
          productGrid.appendChild(product);
        });
        
        // Add new markers if there are more pages
        const newPaginationWrapper = doc.querySelector('.pagination-wrapper');
        const newNextMarker = newPaginationWrapper?.querySelector('.pagination__infinite-marker--next');
        
        if (newNextMarker) {
          this.paginationWrapper.appendChild(newNextMarker.cloneNode(true));
          this.observer.observe(newNextMarker);
        }
        
        this.currentPage++;
        this.loadedPages.add(this.currentPage);
        
        // Update pagination info
        this.updatePaginationInfo(doc);
        
        // Update URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('page', this.currentPage);
        this.updateURL(newUrl.toString());
      }
    } catch (error) {
      console.error('Error loading next page:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Show/hide loading state for load more
   */
  showLoadMoreLoading(show) {
    const button = document.querySelector('.pagination__load-more-btn');
    const loadingDiv = button?.querySelector('.pagination__loading');
    const textSpan = button?.querySelector('.pagination__load-more-text');
    
    if (!button) return;
    
    if (show) {
      button.disabled = true;
      textSpan.style.display = 'none';
      loadingDiv.style.display = 'flex';
    } else {
      button.disabled = false;
      textSpan.style.display = 'block';
      loadingDiv.style.display = 'none';
    }
  }

  /**
   * Show/hide loading state for traditional pagination
   */
  showLoadingState(show) {
    if (!this.paginationWrapper) return;

    if (show) {
      this.paginationWrapper.classList.add('pagination--loading');
    } else {
      this.paginationWrapper.classList.remove('pagination--loading');
    }
  }

  /**
   * Update pagination info
   */
  updatePaginationInfo(doc) {
    const currentInfo = document.querySelector('.pagination__info-text');
    const newInfo = doc.querySelector('.pagination__info-text');
    
    if (currentInfo && newInfo) {
      currentInfo.textContent = newInfo.textContent;
    }
  }

  /**
   * Scroll to results container
   */
  scrollToResults() {
    const resultsContainer = document.getElementById('ResultsList');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  /**
   * Update URL without page reload
   */
  updateURL(url) {
    if (history.pushState) {
      history.pushState(null, null, url);
    }
  }

  /**
   * Get section ID from the page
   */
  getSectionId() {
    const sectionElement = document.querySelector('[id^="shopify-section-"]');
    return sectionElement?.id.replace('shopify-section-', '') || '';
  }

  /**
   * Destroy pagination (cleanup)
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize pagination when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AdvancedPagination();
});

// Export for module usage if needed
export default AdvancedPagination;
