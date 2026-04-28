/**
 * Seat Selection System for Ticketmaster-like Venue Map
 * Handles interactive seat/section selection, pricing, and availability
 */

class SeatSelectionManager {
  constructor() {
    this.selectedSeats = new Map(); // Map of seatId -> seatData
    this.selectedSections = new Set(); // Set of sectionIds
    this.maxTickets = 2;
    this.currentSection = null;
    
    // Pricing data per section level (in this case, sections)
    this.pricingTiers = {
      '100': 632,   // 100 Level - Premium
      '200': 450,   // 200 Level - Upper Premium
      '300': 280,   // 300 Level - Standard
      '400': 150,   // 400 Level - Economy
      'CLUB': 550,  // Club seats
      'PIT': 95,    // Floor/Pit
    };
    
    // Seat availability per section (simulated)
    this.seatAvailability = {};
    this.initializeSeatData();
    this.setupEventListeners();
  }

  /**
   * Initialize seat/section data
   */
  initializeSeatData() {
    const sections = document.querySelectorAll('.map-section[data-section-id]');
    sections.forEach(section => {
      const sectionId = section.getAttribute('data-section-id');
      const sectionName = section.getAttribute('data-section-name');
      
      // Extract level from section name (first digits)
      const level = this.extractLevel(sectionName);
      
      // Generate seat data for this section
      const seatsPerSection = Math.floor(Math.random() * 5) + 8; // 8-12 seats
      const availableSeats = Math.floor(Math.random() * seatsPerSection) + 1;
      
      this.seatAvailability[sectionId] = {
        name: sectionName,
        level: level,
        totalSeats: seatsPerSection,
        availableSeats: availableSeats,
        price: this.getPriceForLevel(level),
        seats: this.generateSeats(sectionId, seatsPerSection, availableSeats)
      };
    });
  }

  /**
   * Extract seating level from section name (100, 200, 300, 400, CLUB, PIT)
   */
  extractLevel(sectionName) {
    if (sectionName.startsWith('PIT')) return 'PIT';
    if (sectionName.startsWith('CLUB')) return 'CLUB';
    if (sectionName.startsWith('A') || sectionName.startsWith('B') || sectionName.startsWith('C')) {
      return sectionName.startsWith('C') ? '100' : '200';
    }
    
    const firstThreeChars = sectionName.substring(0, 3);
    if (/^\d{3}$/.test(firstThreeChars)) {
      return firstThreeChars;
    }
    
    return '300'; // Default
  }

  /**
   * Get price for a seating level
   */
  getPriceForLevel(level) {
    return this.pricingTiers[level] || 300;
  }

  /**
   * Generate seat objects for a section
   */
  generateSeats(sectionId, total, available) {
    const seats = [];
    const soldIndices = new Set();
    
    // Randomly mark some seats as sold
    for (let i = 0; i < total - available; i++) {
      let randomIdx;
      do {
        randomIdx = Math.floor(Math.random() * total);
      } while (soldIndices.has(randomIdx));
      soldIndices.add(randomIdx);
    }
    
    for (let i = 0; i < total; i++) {
      seats.push({
        id: `${sectionId}-seat-${i + 1}`,
        row: String.fromCharCode(65 + Math.floor(i / 4)), // A, B, C, etc.
        number: (i % 4) + 1,
        status: soldIndices.has(i) ? 'sold' : 'available',
        price: this.pricingTiers[this.extractLevel(sectionId.split('-')[1] || '300')] || 300
      });
    }
    
    return seats;
  }

  /**
   * Setup event listeners for section clicks
   */
  setupEventListeners() {
    const sections = document.querySelectorAll('.map-section[data-section-id]');
    
    sections.forEach(section => {
      section.addEventListener('click', (e) => {
        if (section.classList.contains('is-available')) {
          this.handleSectionClick(section);
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

    // Setup bottom sheet interactions
    this.setupBottomSheetListeners();
  }

  /**
   * Handle section/seat selection
   */
  handleSectionClick(sectionElement) {
    const sectionId = sectionElement.getAttribute('data-section-id');
    const sectionName = sectionElement.getAttribute('data-section-name');
    
    this.currentSection = { id: sectionId, name: sectionName };
    
    // Update UI
    this.updateSectionSelection(sectionElement);
    this.displayTicketList(sectionId);
  }

  /**
   * Update visual selection of section
   */
  updateSectionSelection(sectionElement) {
    // Remove previous selection
    document.querySelectorAll('.map-section.sel').forEach(el => {
      el.classList.remove('sel');
    });
    
    // Add selection to current section
    sectionElement.classList.add('sel');
  }

  /**
   * Display available seats/tickets for selected section
   */
  displayTicketList(sectionId) {
    const sectionData = this.seatAvailability[sectionId];
    if (!sectionData) return;
    
    // Update bottom sheet title
    const sheetTitleRow = document.querySelector('.sheet-title-row');
    if (sheetTitleRow) {
      const sectionName = document.querySelector('.sheet-section-name');
      if (sectionName) {
        sectionName.textContent = `Section ${sectionData.name}`;
      }
    }
    
    // Show ticket list
    const ticketList = document.querySelector('.ticket-list');
    if (ticketList) {
      ticketList.classList.add('active');
      ticketList.innerHTML = sectionData.seats
        .map(seat => this.createTicketItemHTML(seat, sectionId))
        .join('');
      
      // Add click handlers to tickets
      ticketList.querySelectorAll('.ticket-item').forEach(item => {
        item.addEventListener('click', (e) => {
          this.handleSeatSelection(e, item, sectionId);
        });
      });
    }
    
    // Show back button and hide main content
    this.updateSheetContent(sectionData);
  }

  /**
   * Create HTML for a ticket item
   */
  createTicketItemHTML(seat, sectionId) {
    const isSelectable = seat.status === 'available';
    const isSelected = this.selectedSeats.has(seat.id);
    const classList = [`ticket-item`, isSelected && 'active']
      .filter(Boolean)
      .join(' ');
    
    return `
      <div class="${classList}" 
           data-seat-id="${seat.id}"
           data-section-id="${sectionId}"
           style="cursor: ${isSelectable ? 'pointer' : 'not-allowed'}; 
                   opacity: ${isSelectable ? '1' : '0.5'};">
        <div class="ticket-item-left">
          <div class="ticket-section">${seat.row}${seat.number}</div>
          <div class="ticket-desc">
            ${seat.status === 'sold' ? '❌ Sold Out' : '✓ Available'}
          </div>
          <div class="ticket-avail">
            ${isSelectable ? '💺 Select Seat' : '🔒 Not Available'}
          </div>
        </div>
        <div class="ticket-price">$${seat.price}</div>
      </div>
    `;
  }

  /**
   * Handle individual seat selection
   */
  handleSeatSelection(event, itemElement, sectionId) {
    const seatId = itemElement.getAttribute('data-seat-id');
    const seat = this.seatAvailability[sectionId].seats
      .find(s => s.id === seatId);
    
    if (seat.status !== 'available') {
      alert('This seat is not available');
      return;
    }
    
    const isCurrentlySelected = this.selectedSeats.has(seatId);
    
    if (isCurrentlySelected) {
      // Deselect
      this.selectedSeats.delete(seatId);
      itemElement.classList.remove('active');
    } else {
      // Check if we can select more
      if (this.selectedSeats.size >= this.maxTickets) {
        alert(`You can only select up to ${this.maxTickets} seats`);
        return;
      }
      
      // Select
      this.selectedSeats.set(seatId, seat);
      itemElement.classList.add('active');
    }
    
    this.updatePricingSummary();
  }

  /**
   * Update sheet content when section is selected
   */
  updateSheetContent(sectionData) {
    const sheetContent = document.querySelector('.sheet-content');
    if (sheetContent) {
      sheetContent.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <button class="back-btn" id="backBtn">‹</button>
          <h2 class="sheet-section-name" style="flex: 1; margin:0; text-align: left; margin-left: 12px;">
            Section ${sectionData.name}
          </h2>
        </div>
        <p>${sectionData.availableSeats}/${sectionData.totalSeats} seats available • $${sectionData.price}+</p>
      `;
      
      document.getElementById('backBtn')?.addEventListener('click', () => {
        this.goBackToList();
      });
    }
  }

  /**
   * Go back to main sheet view
   */
  goBackToList() {
    const sheetContent = document.querySelector('.sheet-content');
    const ticketList = document.querySelector('.ticket-list');
    
    if (sheetContent && ticketList) {
      sheetContent.innerHTML = `
        <h2>Select a Section</h2>
        <p>Choose a section on the map to view available seats</p>
      `;
      ticketList.classList.remove('active');
    }
    
    // Remove section selection
    document.querySelectorAll('.map-section.sel').forEach(el => {
      el.classList.remove('sel');
    });
    
    this.currentSection = null;
  }

  /**
   * Show tooltip with section info on hover
   */
  showTooltip(sectionElement) {
    const sectionId = sectionElement.getAttribute('data-section-id');
    const sectionData = this.seatAvailability[sectionId];
    
    if (!sectionData) return;
    
    const tooltip = document.getElementById('mapTooltip');
    if (tooltip) {
      tooltip.textContent = `${sectionData.name} - $${sectionData.price} (${sectionData.availableSeats} avail)`;
      tooltip.classList.add('show');
      
      // Position tooltip at mouse location
      const rect = sectionElement.getBoundingClientRect();
      tooltip.style.top = (rect.top + window.scrollY - 40) + 'px';
      tooltip.style.left = (rect.left + rect.width / 2) + 'px';
      tooltip.style.transform = 'translateX(-50%)';
    }
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.getElementById('mapTooltip');
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

  /**
   * Setup bottom sheet listeners
   */
  setupBottomSheetListeners() {
    // Back button
    const backBtn = document.querySelector('.back-btn');
    if (backBtn && !backBtn.hasAttribute('data-listener-added')) {
      backBtn.addEventListener('click', () => this.goBackToList());
      backBtn.setAttribute('data-listener-added', 'true');
    }
  }

  /**
   * Update pricing summary
   */
  updatePricingSummary() {
    let totalPrice = 0;
    this.selectedSeats.forEach(seat => {
      totalPrice += seat.price;
    });
    
    // Update UI with selected count and price
    const eventMeta = document.querySelector('.event-meta');
    if (eventMeta && this.selectedSeats.size > 0) {
      const priceElement = document.querySelector('[data-item="total-price"]');
      if (priceElement) {
        priceElement.textContent = `$${totalPrice.toLocaleString()}`;
      }
    }
    
    // Log for debugging
    console.log(`Selected: ${this.selectedSeats.size} seats | Total: $${totalPrice}`);
  }

  /**
   * Get selected seats summary
   */
  getSelectedSeatsSummary() {
    if (this.selectedSeats.size === 0) {
      return { count: 0, total: 0, seats: [] };
    }
    
    let total = 0;
    const seats = [];
    this.selectedSeats.forEach((seat, id) => {
      total += seat.price;
      seats.push(`${seat.row}${seat.number}`);
    });
    
    return {
      count: this.selectedSeats.size,
      total: total,
      seats: seats
    };
  }

  /**
   * Reset selection
   */
  resetSelection() {
    this.selectedSeats.clear();
    this.selectedSections.clear();
    this.currentSection = null;
    
    document.querySelectorAll('.map-section.sel').forEach(el => {
      el.classList.remove('sel');
    });
    
    document.querySelectorAll('.ticket-item.active').forEach(el => {
      el.classList.remove('active');
    });
    
    this.goBackToList();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.seatManager = new SeatSelectionManager();
  });
} else {
  window.seatManager = new SeatSelectionManager();
}
