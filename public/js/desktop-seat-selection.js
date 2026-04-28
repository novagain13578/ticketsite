/**
 * Desktop Seat Selection Manager
 * Handles the 3-column layout for desktop ticket selection
 */

class DesktopSeatManager extends SeatSelectionManager {
  constructor() {
    super();
    this.initializeDesktopUI();
  }

  /**
   * Initialize desktop-specific UI elements
   */
  initializeDesktopUI() {
    // Clone map to desktop panel
    this.setupMapPanel();
    
    // Setup desktop ticket panel
    this.setupTicketPanel();
    
    // Setup zoom controls
    this.setupZoomControls();
    
    // Setup date selection
    this.setupDateSelection();
  }

  /**
   * Setup the desktop map panel
   */
  setupMapPanel() {
    const mobileMap = document.querySelector('.map-container svg');
    const desktopMount = document.getElementById('desktopMapMount');
    
    if (mobileMap && desktopMount) {
      // Clone the SVG to desktop
      const clonedMap = mobileMap.cloneNode(true);
      desktopMount.appendChild(clonedMap);
      
      // Reattach event listeners to cloned sections
      this.reattachSectionListeners(desktopMount);
      
      // Setup zoom handlers (method not yet implemented - using setupZoomControls instead)
      // this.setupDesktopZoom(desktopMount);
    }
  }

  /**
   * Reattach event listeners to cloned sections
   */
  reattachSectionListeners(container) {
    const sections = container.querySelectorAll('.map-section[data-section-id]');
    sections.forEach(section => {
      section.addEventListener('click', (e) => {
        if (section.classList.contains('is-available')) {
          this.handleDesktopSectionClick(section);
        }
      });
      
      section.addEventListener('mouseenter', (e) => {
        if (section.classList.contains('is-available')) {
          this.showTooltip(section);
        }
      });
      
      section.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  /**
   * Handle section click in desktop view
   */
  handleDesktopSectionClick(sectionElement) {
    const sectionId = sectionElement.getAttribute('data-section-id');
    const sectionName = sectionElement.getAttribute('data-section-name');
    
    this.currentSection = { id: sectionId, name: sectionName };
    
    // Update selection state
    this.updateSectionSelection(sectionElement);
    
    // Populate desktop ticket panel
    this.displayDesktopTickets(sectionId);
  }

  /**
   * Display tickets in desktop right panel
   */
  displayDesktopTickets(sectionId) {
    const sectionData = this.seatAvailability[sectionId];
    if (!sectionData) return;
    
    const desktopPanel = document.getElementById('desktopTicketList');
    if (!desktopPanel) return;
    
    // Clear existing tickets
    desktopPanel.innerHTML = '';
    
    // Add section header
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="padding: 12px 16px; border-bottom: 1px solid #ebebeb;">
        <div style="font-size: 13px; color: #666; margin-bottom: 4px;">SECTION ${sectionData.name}</div>
        <div style="font-size: 14px; font-weight: 600;">
          ${sectionData.availableSeats}/${sectionData.totalSeats} Available
        </div>
      </div>
    `;
    desktopPanel.appendChild(header);
    
    // Add ticket items
    const ticketsContainer = document.createElement('div');
    ticketsContainer.className = 'desktop-ticket-items';
    
    sectionData.seats.forEach(seat => {
      const isAvailable = seat.status === 'available';
      const isSelected = this.selectedSeats.has(seat.id);
      
      const ticketItem = document.createElement('div');
      ticketItem.className = `desktop-ticket-item ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`;
      ticketItem.style.opacity = isAvailable ? '1' : '0.5';
      ticketItem.style.cursor = isAvailable ? 'pointer' : 'not-allowed';
      
      ticketItem.innerHTML = `
        <div class="ticket-thumb">
          <svg width="100%" height="100%" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="10" width="80" height="60" fill="#e8edf5" stroke="#c8dcf5" stroke-width="1"/>
            <text x="50" y="50" font-size="16" font-weight="bold" fill="#1a4fc4" text-anchor="middle" dominant-baseline="middle">
              ${seat.row}${seat.number}
            </text>
          </svg>
        </div>
        <div class="ticket-info">
          <div class="ticket-section-label">Row ${seat.row}, Seat ${seat.number}</div>
          <div class="ticket-desc-small">${isAvailable ? '✓ Available' : '❌ Sold Out'}</div>
        </div>
        <div class="ticket-price-right">$${seat.price}</div>
      `;
      
      if (isAvailable) {
        ticketItem.addEventListener('click', () => {
          this.handleDesktopSeatSelection(seat, ticketItem, sectionId);
        });
      }
      
      ticketsContainer.appendChild(ticketItem);
    });
    
    desktopPanel.appendChild(ticketsContainer);
  }

  /**
   * Handle seat selection in desktop view
   */
  handleDesktopSeatSelection(seat, element, sectionId) {
    if (seat.status !== 'available') return;
    
    const isSelected = this.selectedSeats.has(seat.id);
    
    if (isSelected) {
      this.selectedSeats.delete(seat.id);
      element.classList.remove('selected');
    } else {
      if (this.selectedSeats.size >= this.maxTickets) {
        alert(`Maximum ${this.maxTickets} tickets`);
        return;
      }
      this.selectedSeats.set(seat.id, seat);
      element.classList.add('selected');
    }
    
    this.updateDesktopSummary();
  }

  /**
   * Update desktop purchase summary
   */
  updateDesktopSummary() {
    // Implementation would depend on desktop layout structure
    this.updatePricingSummary();
  }

  /**
   * Setup zoom controls
   */
  setupZoomControls() {
    const resetBtn = document.getElementById('desktopResetBtn');
    const zoomInBtn = document.getElementById('desktopZoomIn');
    const zoomOutBtn = document.getElementById('desktopZoomOut');
    const mapContainer = document.getElementById('desktopMapMount');
    
    if (!mapContainer) return;
    
    let currentZoom = 1;
    const minZoom = 0.5;
    const maxZoom = 3;
    const zoomStep = 0.1;
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentZoom = 1;
        this.applyZoom(mapContainer, currentZoom);
      });
    }
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (currentZoom < maxZoom) {
          currentZoom += zoomStep;
          this.applyZoom(mapContainer, currentZoom);
        }
      });
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (currentZoom > minZoom) {
          currentZoom -= zoomStep;
          this.applyZoom(mapContainer, currentZoom);
        }
      });
    }
  }

  /**
   * Apply zoom transformation
   */
  applyZoom(container, zoomLevel) {
    const svg = container.querySelector('svg');
    if (svg) {
      svg.style.transform = `scale(${zoomLevel})`;
      svg.style.transformOrigin = 'top left';
      svg.style.transition = 'transform 0.2s ease';
    }
  }

  /**
   * Setup date selection sidebar
   */
  setupDateSelection() {
    const dateItems = document.querySelectorAll('.date-item');
    dateItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove active from all
        dateItems.forEach(d => d.classList.remove('active'));
        // Add active to this one
        item.classList.add('active');
      });
    });
  }
}

// Initialize desktop manager when DOM is ready
if (window.innerWidth >= 768) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.seatManager) {
        window.desktopManager = new DesktopSeatManager();
      }
    });
  } else {
    if (window.seatManager) {
      window.desktopManager = new DesktopSeatManager();
    }
  }
}
