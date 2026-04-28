/**
 * SEAT SELECTION → CHECKOUT INTEGRATION
 * Dynamic cart state management, visual feedback, and Cash App payment flow
 * Integrates with existing SVG zoom system and checkout modal
 */

class SeatCheckoutManager {
  constructor() {
    // ============================================
    // CART STATE MANAGEMENT
    // ============================================
    this.cart = []; // [{id, section, row, seat, price}, ...]
    this.seatColors = new Map(); // Store original colors
    
    // ============================================
    // DOM ELEMENT REFERENCES
    // ============================================
    this.elements = {
      checkoutBar: document.getElementById('checkout-bar'),
      checkoutCounter: document.getElementById('checkout-counter'),
      checkoutTotal: document.getElementById('checkout-total'),
      payNowBtn: document.getElementById('checkout-pay-btn'),
      
      // Modal elements
      modal: document.getElementById('cashappModal'),
      modalItemsList: document.getElementById('modal-items-list'),
      modalGrandTotal: document.getElementById('modal-grand-total'),
      cashAppBtn: document.getElementById('cashAppPayBtn'),
    };
    
    // ============================================
    // CONFIGURATION
    // ============================================
    this.config = {
      selectionColor: '#ffe000', // Selection Gold
      animationDuration: 600, // ms
      cashAppTag: 'NovadeniaConcerts', // Replace with actual tag
    };
    
    this.init();
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  init() {
    console.log('🔧 Initializing SeatCheckoutManager...');
    
    // Verify all required elements exist
    const requiredElements = {
      'checkout-bar': this.elements.checkoutBar,
      'checkout-pay-btn': this.elements.payNowBtn,
      'cashappModal': this.elements.modal,
      'modal-items-list': this.elements.modalItemsList,
    };
    
    const missing = Object.entries(requiredElements)
      .filter(([_, el]) => !el)
      .map(([id, _]) => id);
    
    if (missing.length > 0) {
      console.warn('⚠️ Missing elements:', missing.join(', '));
    }
    
    this.attachSeatListeners();
    this.attachCheckoutBarListeners();
    this.syncCheckoutBar();
    console.log('✅ Seat → Checkout Integration Initialized');
  }

  // ============================================
  // 1. SEAT CLICK HANDLING & CART MANAGEMENT
  // ============================================
  attachSeatListeners() {
    // Attach to #map-stage or .seat-layer for event delegation
    const mapStage = document.getElementById('map-stage') || 
                      document.querySelector('.seat-layer') ||
                      document.querySelector('.stadium-svg');
    
    if (!mapStage) {
      console.warn('⚠️ No map-stage or seat-layer found');
      return;
    }

    mapStage.addEventListener('click', (e) => {
      const seat = e.target.closest('[data-seat]');
      if (!seat) return;

      // Skip sold/unavailable seats
      if (seat.classList.contains('sold') || 
          seat.classList.contains('unavailable')) {
        return;
      }

      const seatId = seat.getAttribute('data-seat');
      const section = seat.getAttribute('data-section') || 'Unknown';
      const row = seat.getAttribute('data-row') || 'A';
      const priceText = seat.getAttribute('data-price') || '0';
      const price = parseFloat(priceText.replace('$', '').replace(',', ''));

      // Check if seat is already in cart
      const existingIdx = this.cart.findIndex(s => s.id === seatId);

      if (existingIdx >= 0) {
        // REMOVE from cart
        this.cart.splice(existingIdx, 1);
        this.updateSeatColor(seat, 'remove');
        this.removePulseAnimation(seat);
      } else {
        // ADD to cart
        this.cart.push({
          id: seatId,
          section,
          row,
          seat: seatId.split('-')[2] || 'N/A',
          price,
        });
        this.updateSeatColor(seat, 'add');
        this.addPulseAnimation(seat);
      }

      this.syncCheckoutBar();
      console.log(`🎟️ Cart Updated:`, this.cart);
    });
  }

  // Store and restore seat colors
  updateSeatColor(seat, action) {
    if (action === 'add') {
      // Store original color
      const computedStyle = window.getComputedStyle(seat);
      const originalFill = computedStyle.fill || '#a8c8f0';
      this.seatColors.set(seat.getAttribute('data-seat'), originalFill);
      
      // Apply selection color
      seat.setAttribute('fill', this.config.selectionColor);
      seat.classList.add('selected');
    } else if (action === 'remove') {
      // Restore original color
      const seatId = seat.getAttribute('data-seat');
      const originalColor = this.seatColors.get(seatId) || '#a8c8f0';
      seat.setAttribute('fill', originalColor);
      seat.classList.remove('selected');
      this.seatColors.delete(seatId);
    }
  }

  // ============================================
  // 2. VISUAL FEEDBACK - PULSE ANIMATION
  // ============================================
  addPulseAnimation(seat) {
    seat.classList.add('seat-pulse');
    
    // Remove pulse class after animation completes
    setTimeout(() => {
      seat.classList.remove('seat-pulse');
    }, this.config.animationDuration);
  }

  removePulseAnimation(seat) {
    seat.classList.remove('seat-pulse');
  }

  // ============================================
  // 3. CHECKOUT BAR SYNC
  // ============================================
  syncCheckoutBar() {
    // Update visibility
    if (this.cart.length === 0) {
      if (this.elements.checkoutBar) {
        this.elements.checkoutBar.classList.add('hidden');
      }
      return;
    }

    if (this.elements.checkoutBar) {
      this.elements.checkoutBar.classList.remove('hidden');
    }

    // Calculate totals
    const count = this.cart.length;
    const total = this.cart.reduce((sum, s) => sum + s.price, 0);

    // Update display text
    if (this.elements.checkoutCounter) {
      this.elements.checkoutCounter.textContent = count;
    }
    if (this.elements.checkoutTotal) {
      this.elements.checkoutTotal.textContent = `$${total.toFixed(2)}`;
    }
  }

  // ============================================
  // 4. CHECKOUT BAR EVENT LISTENERS
  // ============================================
  attachCheckoutBarListeners() {
    const payBtn = this.elements.payNowBtn;
    if (payBtn) {
      payBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔘 Pay Now button clicked');
        this.openCheckoutModal();
      });
      console.log('✅ Pay Now button listener attached');
    } else {
      console.warn('⚠️ Pay Now button (#checkout-pay-btn) not found');
    }
  }

  // ============================================
  // 5. CHECKOUT MODAL - ITEMIZED LIST & TOTAL
  // ============================================
  openCheckoutModal() {
    if (!this.elements.modal) {
      console.error('❌ Checkout modal element not found (#cashappModal)');
      return;
    }

    if (this.cart.length === 0) {
      console.warn('⚠️ Cart is empty, cannot checkout');
      alert('Please select at least one seat to continue');
      return;
    }

    console.log('📋 Opening checkout modal with', this.cart.length, 'seat(s)');
    
    // Populate itemized list
    this.renderModalItems();
    
    // Update grand total
    this.updateModalGrandTotal();
    
    // Update Cash App deep link
    this.updateCashAppLink();
    
    // Show modal - use flex display to match CSS design
    this.elements.modal.style.display = 'flex';
    this.elements.modal.classList.add('show');
    
    console.log('✅ Modal displayed');
    
    // Scroll to top of modal
    window.scrollTo(0, 0);
  }

  renderModalItems() {
    if (!this.elements.modalItemsList) return;

    const html = this.cart.map(item => `
      <div class="modal-item" data-seat-id="${item.id}">
        <div class="modal-item-info">
          <span class="section-label">Sec ${item.section}</span>
          <span class="row-label">Row ${item.row}</span>
          <span class="seat-label">Seat ${item.seat}</span>
        </div>
        <div class="modal-item-price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');

    this.elements.modalItemsList.innerHTML = html;
  }

  updateModalGrandTotal() {
    if (!this.elements.modalGrandTotal) return;

    const total = this.cart.reduce((sum, s) => sum + s.price, 0);
    this.elements.modalGrandTotal.textContent = `$${total.toFixed(2)}`;
  }

  // ============================================
  // 6. CASH APP DEEP LINK INTEGRATION
  // ============================================
  updateCashAppLink() {
    if (!this.elements.cashAppBtn) return;

    const total = this.cart.reduce((sum, s) => sum + s.price, 0);
    const deepLink = `https://cash.app/$${this.config.cashAppTag}/${total.toFixed(2)}`;
    
    this.elements.cashAppBtn.href = deepLink;
    this.elements.cashAppBtn.setAttribute('data-total', total.toFixed(2));
    
    console.log(`💰 Cash App Link: ${deepLink}`);
  }

  // ============================================
  // 7. PURCHASE CONFIRMATION & CLEANUP
  // ============================================
  confirmPurchase() {
    // Clear cart
    this.clearCart();
    
    // Hide checkout bar
    if (this.elements.checkoutBar) {
      this.elements.checkoutBar.classList.add('hidden');
    }
    
    // Close modal
    if (this.elements.modal) {
      this.elements.modal.style.display = 'none';
    }
    
    console.log('✅ Purchase confirmed - Cart cleared');
  }

  clearCart() {
    // Reset all seat colors
    this.cart.forEach(item => {
      const seat = document.querySelector(`[data-seat="${item.id}"]`);
      if (seat) {
        this.updateSeatColor(seat, 'remove');
      }
    });

    // Clear cart array
    this.cart = [];
    this.seatColors.clear();
    this.syncCheckoutBar();
  }

  // ============================================
  // 8. PUBLIC API FOR EXTERNAL CONTROL
  // ============================================
  getCart() {
    return [...this.cart];
  }

  getCartTotal() {
    return this.cart.reduce((sum, s) => sum + s.price, 0);
  }

  getCartCount() {
    return this.cart.length;
  }

  addSeatToCart(seatId, section, row, seatName, price) {
    if (!this.cart.find(s => s.id === seatId)) {
      this.cart.push({ id: seatId, section, row, seat: seatName, price });
      this.syncCheckoutBar();
    }
  }

  removeSeatFromCart(seatId) {
    const idx = this.cart.findIndex(s => s.id === seatId);
    if (idx >= 0) {
      this.cart.splice(idx, 1);
      this.syncCheckoutBar();
    }
  }
}

// ============================================
// GLOBAL INITIALIZATION
// ============================================
let seatCheckoutManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOMContentLoaded: Creating SeatCheckoutManager');
    seatCheckoutManager = new SeatCheckoutManager();
    window.seatCheckoutManager = seatCheckoutManager; // Expose globally
    console.log('🌍 seatCheckoutManager exposed to window');
  });
} else {
  console.log('🎯 DOM already loaded: Creating SeatCheckoutManager');
  seatCheckoutManager = new SeatCheckoutManager();
  window.seatCheckoutManager = seatCheckoutManager;
  console.log('🌍 seatCheckoutManager exposed to window');
}
