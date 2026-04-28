/**
 * SEAT SELECTION → CHECKOUT INTEGRATION EXAMPLES
 * Real-world code snippets for integrating seats with dynamic cart and Cash App payment
 */

// ============================================
// EXAMPLE 1: Cart State Access
// ============================================
// Get the current cart
const currentCart = seatCheckoutManager.getCart();
console.log('Current cart:', currentCart);
// Output: [{id, section, row, seat, price}, ...]

// Get totals
const count = seatCheckoutManager.getCartCount();
const total = seatCheckoutManager.getCartTotal();
console.log(`${count} seats, ${total} total`);

// ============================================
// EXAMPLE 2: Programmatic Seat Addition
// ============================================
// Add a seat to cart manually (without clicking)
seatCheckoutManager.addSeatToCart(
  'seat-s_101-01',     // seatId
  '101',               // section
  'A',                 // row
  'Seat 5',            // seatName
  380                  // price
);

// ============================================
// EXAMPLE 3: Remove Seat from Cart
// ============================================
seatCheckoutManager.removeSeatFromCart('seat-s_101-01');

// ============================================
// EXAMPLE 4: Open Checkout Modal Manually
// ============================================
seatCheckoutManager.openCheckoutModal();

// ============================================
// EXAMPLE 5: Listen for Checkout Bar Updates
// ============================================
// Watch the DOM for checkout bar changes
const observer = new MutationObserver((mutations) => {
  const bar = document.getElementById('checkout-bar');
  if (bar && !bar.classList.contains('hidden')) {
    console.log('🎟️ Checkout bar is now visible');
  }
});

observer.observe(document.getElementById('checkout-bar'), {
  attributes: true,
  attributeFilter: ['class'],
});

// ============================================
// EXAMPLE 6: Customize Cash App Tag
// ============================================
// Update the Cash App cashtag before opening modal
seatCheckoutManager.config.cashAppTag = 'YourCashAppTag';
seatCheckoutManager.openCheckoutModal();

// On the next page load, it will generate:
// https://cash.app/$YourCashAppTag/{total}

// ============================================
// EXAMPLE 7: Clear Cart Programmatically
// ============================================
seatCheckoutManager.clearCart();
console.log('Cart cleared, all seats reset to original colors');

// ============================================
// EXAMPLE 8: Hook into SVG Seat Attributes
// ============================================
// Get all sections with injected attributes
const allSeats = document.querySelectorAll('[data-seat]');
allSeats.forEach(seat => {
  console.log({
    seatId: seat.getAttribute('data-seat'),
    section: seat.getAttribute('data-section'),
    price: seat.getAttribute('data-price'),
    row: seat.getAttribute('data-row'),
  });
});

// ============================================
// EXAMPLE 9: Get Price for Any Section
// ============================================
// Use the SVG seat injector to look up prices
const section101Price = svgSeatInjector.getPrice('101');    // 380
const clubPrice = svgSeatInjector.getPrice('CLUB 109');     // 350
const pitPrice = svgSeatInjector.getPrice('PIT A');         // 680

console.log(`Section 101: $${section101Price}, Club: $${clubPrice}, Pit: $${pitPrice}`);

// ============================================
// EXAMPLE 10: Advanced - Custom Event Handling
// ============================================
// Listen for modal opening
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('cashappModal');
  const observer = new MutationObserver(() => {
    if (modal.style.display !== 'none') {
      console.log('📱 Checkout modal opened');
      const total = seatCheckoutManager.getCartTotal();
      console.log(`💰 Total to charge: $${total}`);
    }
  });
  observer.observe(modal, { attributes: true });
});

// ============================================
// EXAMPLE 11: Validation Before Checkout
// ============================================
function validateCheckout() {
  const cart = seatCheckoutManager.getCart();
  
  // Require at least one seat
  if (cart.length === 0) {
    alert('Please select at least one seat');
    return false;
  }
  
  // Cap maximum seats per order
  if (cart.length > 10) {
    alert('Maximum 10 seats per order');
    return false;
  }
  
  // Ensure all prices are valid
  if (cart.some(s => s.price <= 0)) {
    alert('Invalid seat price detected');
    return false;
  }
  
  return true;
}

// Use in custom button
document.addEventListener('DOMContentLoaded', () => {
  const payBtn = document.getElementById('checkout-pay-btn');
  payBtn.addEventListener('click', () => {
    if (validateCheckout()) {
      seatCheckoutManager.openCheckoutModal();
    }
  });
});

// ============================================
// EXAMPLE 12: Sync with Admin Dashboard
// ============================================
// Send cart to backend for confirmation
async function submitOrderToBackend() {
  const cart = seatCheckoutManager.getCart();
  const total = seatCheckoutManager.getCartTotal();
  
  try {
    const response = await fetch('http://localhost:3000/api/order/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seats: cart,
        totalPrice: total,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (response.ok) {
      const order = await response.json();
      console.log('✅ Order created:', order.orderId);
      return order;
    }
  } catch (error) {
    console.error('❌ Order submission failed:', error);
  }
}

// ============================================
// EXAMPLE 13: Visual Feedback on Selection
// ============================================
// Add custom notification when seat is added
document.addEventListener('DOMContentLoaded', () => {
  const mapStage = document.getElementById('map-stage') || 
                    document.querySelector('.seat-layer');
  
  if (mapStage) {
    mapStage.addEventListener('click', (e) => {
      const seat = e.target.closest('[data-seat]');
      if (seat && !seat.classList.contains('sold')) {
        const seatId = seat.getAttribute('data-seat');
        const isInCart = seatCheckoutManager.getCart()
          .some(s => s.id === seatId);
        
        if (isInCart) {
          showNotification('✅ Seat added to cart');
        } else {
          showNotification('❌ Seat removed from cart');
        }
      }
    });
  }
});

function showNotification(message) {
  const notify = document.createElement('div');
  notify.textContent = message;
  notify.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 20px;
    background: #0a2a6e;
    color: #ffe000;
    padding: 12px 18px;
    border-radius: 6px;
    font-weight: 700;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notify);
  
  setTimeout(() => {
    notify.remove();
  }, 2000);
}

// ============================================
// EXAMPLE 14: Get Itemized Receipt
// ============================================
function generateReceipt() {
  const cart = seatCheckoutManager.getCart();
  
  const receipt = {
    timestamp: new Date().toISOString(),
    items: cart.map(item => ({
      section: item.section,
      row: item.row,
      seat: item.seat,
      price: item.price,
      lineTotal: item.price,
    })),
    subtotal: cart.reduce((sum, s) => sum + s.price, 0),
    tax: 0, // Configure as needed
    total: cart.reduce((sum, s) => sum + s.price, 0),
  };
  
  return receipt;
}

// Usage
const receipt = generateReceipt();
console.log(JSON.stringify(receipt, null, 2));

// ============================================
// EXAMPLE 15: Reset State on Page Load
// ============================================
// Clear previous selections when page loads
window.addEventListener('load', () => {
  // Option 1: Clear immediately
  // seatCheckoutManager.clearCart();
  
  // Option 2: Ask user
  if (sessionStorage.getItem('hasCart')) {
    const restore = confirm('Restore previous selection?');
    if (!restore) {
      seatCheckoutManager.clearCart();
      sessionStorage.removeItem('hasCart');
    }
  }
});

// Save state before page unload
window.addEventListener('beforeunload', () => {
  if (seatCheckoutManager.getCartCount() > 0) {
    sessionStorage.setItem('hasCart', 'true');
  }
});

// ============================================
// EXAMPLE 16: Responsive Checkout Bar
// ============================================
// Auto-hide checkout bar on small screens
const checkoutBar = document.getElementById('checkout-bar');

window.addEventListener('resize', () => {
  if (window.innerWidth < 480) {
    // On mobile: reduce bar height
    checkoutBar.style.height = '60px';
    checkoutBar.style.fontSize = '12px';
  } else {
    // On desktop: full height
    checkoutBar.style.height = '70px';
    checkoutBar.style.fontSize = '14px';
  }
});

// ============================================
// EXAMPLE 17: Export Cart for Email
// ============================================
function exportCartAsCSV() {
  const cart = seatCheckoutManager.getCart();
  const headers = ['Section', 'Row', 'Seat', 'Price'];
  const rows = cart.map(s => [s.section, s.row, s.seat, s.price]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.join(',') + '\n';
  });
  
  // Add total
  csv += '\nTotal,' + seatCheckoutManager.getCartTotal();
  
  return csv;
}

// Download as file
function downloadCartCSV() {
  const csv = exportCartAsCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cart-${new Date().toISOString()}.csv`;
  a.click();
}

// ============================================
// EXAMPLE 18: Multi-Event Checkout
// ============================================
// Support multiple events' carts
class MultiEventCart {
  constructor() {
    this.carts = new Map(); // eventId -> cart
  }
  
  switchEvent(eventId) {
    // Save current cart
    const currentEvent = this.getCurrentEvent();
    if (currentEvent) {
      this.carts.set(currentEvent, seatCheckoutManager.getCart());
    }
    
    // Load new event's cart
    const cart = this.carts.get(eventId) || [];
    seatCheckoutManager.clearCart();
    cart.forEach(s => {
      seatCheckoutManager.addSeatToCart(s.id, s.section, s.row, s.seat, s.price);
    });
    
    this.currentEvent = eventId;
  }
  
  getCurrentEvent() {
    return this.currentEvent;
  }
}

// ============================================
// EXAMPLE 19: Analytics Tracking
// ============================================
// Track user behavior
const analytics = {
  cartViews: 0,
  cartClears: 0,
  purchasesCompleted: 0,
  totalSpent: 0,
  
  trackCartOpen() {
    this.cartViews++;
    console.log(`📊 Cart opened ${this.cartViews} times`);
  },
  
  trackCartClear() {
    this.cartClears++;
    console.log(`📊 Cart cleared ${this.cartClears} times`);
  },
  
  trackPurchase(total) {
    this.purchasesCompleted++;
    this.totalSpent += total;
    console.log(`📊 Purchase #${this.purchasesCompleted}: $${total}`);
  },
};

// Hook into manager
document.addEventListener('DOMContentLoaded', () => {
  const originalOpen = seatCheckoutManager.openCheckoutModal;
  seatCheckoutManager.openCheckoutModal = function() {
    analytics.trackCartOpen();
    originalOpen.call(this);
  };
  
  const originalClear = seatCheckoutManager.clearCart;
  seatCheckoutManager.clearCart = function() {
    analytics.trackCartClear();
    originalClear.call(this);
  };
});

// ============================================
// EXAMPLE 20: Integrate with Admin Dashboard
// ============================================
// Send order to admin for approval
async function submitToAdminDashboard() {
  const cart = seatCheckoutManager.getCart();
  const total = seatCheckoutManager.getCartTotal();
  
  const orderData = {
    seats: cart,
    totalPrice: total,
    buyerInfo: {
      name: 'Customer Name',
      email: 'customer@example.com',
      phone: '555-1234',
    },
    paymentMethod: 'cashapp',
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getCashAppToken(),
      },
      body: JSON.stringify(orderData),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Order submitted to admin dashboard:', result);
      seatCheckoutManager.confirmPurchase();
      return result;
    }
  } catch (error) {
    console.error('❌ Admin submission failed:', error);
    throw error;
  }
}

function getCashAppToken() {
  // Get from admin dashboard after Cash App payment
  return localStorage.getItem('cashapp_token') || '';
}
