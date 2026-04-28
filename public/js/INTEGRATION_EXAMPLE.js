/**
 * INTEGRATION EXAMPLE
 * How to integrate Cash App payment into existing seat selection system
 * 
 * This file demonstrates the complete integration with:
 * - Existing seat-selection.js
 * - Existing checkout system
 * - New cashapp-checkout.js
 */

// ============================================================================
// STEP 1: Initialize Cash App Checkout on Page Load
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the Cash App checkout modal
  window.cashappCheckout = new CashAppCheckout({
    backendUrl: '', // Uses relative paths for both dev and production
    timeoutSeconds: 600, // 10 minutes
  });

  // Add Cash App as payment option if not already present
  setupPaymentMethodButtons();
});

// ============================================================================
// STEP 2: Setup Payment Method Selection
// ============================================================================

function setupPaymentMethodButtons() {
  const paymentMethods = document.querySelectorAll('[data-payment-method]');

  paymentMethods.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const method = btn.dataset.paymentMethod;
      handlePaymentMethodSelection(method);
    });
  });
}

function handlePaymentMethodSelection(method) {
  console.log(`Selected payment method: ${method}`);

  // Get current reservation details
  const reservationDetails = getCurrentReservation();
  const seatDetails = getSelectedSeat();

  if (!reservationDetails || !seatDetails) {
    showError('Please select a seat first');
    return;
  }

  switch (method) {
    case 'cashapp':
      openCashAppCheckout(reservationDetails, seatDetails);
      break;
    case 'stripe':
      openStripeCheckout(reservationDetails, seatDetails);
      break;
    case 'paypal':
      openPayPalCheckout(reservationDetails, seatDetails);
      break;
    default:
      showError(`Unknown payment method: ${method}`);
  }
}

// ============================================================================
// STEP 3: Open Cash App Modal
// ============================================================================

function openCashAppCheckout(reservationDetails, seatDetails) {
  console.log('Opening Cash App checkout...');

  // Validate
  if (!reservationDetails.id || !seatDetails.price) {
    showError('Invalid reservation or seat details');
    return;
  }

  // Get event ID from page or config
  const eventId = getEventId();

  // Get user ID (from auth/session)
  const userId = getCurrentUserId();

  // Open modal with all necessary data
  window.cashappCheckout.open({
    reservation_id: reservationDetails.id,
    seat_details: {
      section: seatDetails.section,
      row: seatDetails.row,
      number: seatDetails.number,
      price: seatDetails.price,
    },
    event_id: eventId,
    user_id: userId,
  });
}

// ============================================================================
// STEP 4: Example Payment Method Buttons (HTML in your page)
// ============================================================================

/*
<!-- Add this to your checkout page -->

<div class="payment-method-selector">
  <h2>Select Payment Method</h2>
  
  <button class="payment-button" data-payment-method="cashapp">
    <span class="icon">💰</span>
    <span class="label">Cash App</span>
    <span class="description">Fast & easy</span>
  </button>

  <button class="payment-button" data-payment-method="stripe">
    <span class="icon">💳</span>
    <span class="label">Credit/Debit Card</span>
    <span class="description">Stripe</span>
  </button>

  <button class="payment-button" data-payment-method="paypal">
    <span class="icon">🅿️</span>
    <span class="label">PayPal</span>
    <span class="description">PayPal account</span>
  </button>
</div>

<style>
  .payment-method-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
    margin: 20px 0;
  }

  .payment-button {
    padding: 16px;
    border: 2px solid #ddd;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .payment-button:hover {
    border-color: #1a4fc4;
    transform: translateY(-2px);
  }

  .payment-button .icon {
    font-size: 24px;
  }

  .payment-button .label {
    font-weight: 700;
    font-size: 14px;
  }

  .payment-button .description {
    font-size: 11px;
    color: #999;
  }
</style>
*/

// ============================================================================
// STEP 5: Helper Functions (from your existing code)
// ============================================================================

/**
 * Get current reservation from your seat selection system
 * Adjust based on your implementation (SeatSelectionManager, state, etc)
 */
function getCurrentReservation() {
  // Example: if using SeatSelectionManager from your code
  if (window.seatManager && window.seatManager.currentReservation) {
    return window.seatManager.currentReservation;
  }

  // Or from your state management
  if (window.appState && window.appState.reservation) {
    return window.appState.reservation;
  }

  // Fallback: return null if not found
  return null;
}

/**
 * Get selected seat from your seat selection system
 */
function getSelectedSeat() {
  // Example: from SeatSelectionManager
  if (window.seatManager && window.seatManager.selectedSeat) {
    return {
      section: window.seatManager.selectedSeat.section,
      row: window.seatManager.selectedSeat.row,
      number: window.seatManager.selectedSeat.number,
      price: window.seatManager.selectedSeat.price,
    };
  }

  // Or from bottom sheet
  const sectionInfo = document.querySelector('[data-section-info]');
  if (sectionInfo) {
    return JSON.parse(sectionInfo.dataset.sectionInfo);
  }

  return null;
}

/**
 * Get event ID from page or config
 */
function getEventId() {
  // From data attribute
  const eventEl = document.querySelector('[data-event-id]');
  if (eventEl) {
    return eventEl.dataset.eventId;
  }

  // From global config
  if (window.CONFIG && window.CONFIG.eventId) {
    return window.CONFIG.eventId;
  }

  // Default fallback
  return 'concert_2026_vegas';
}

/**
 * Get current user ID (from session/auth)
 */
function getCurrentUserId() {
  // From session storage
  const userId = sessionStorage.getItem('userId');
  if (userId) {
    return userId;
  }

  // From localStorage
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    // Parse JWT to get user ID
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    return payload.sub || payload.userId;
  }

  // Fallback: anonymous
  return 'user_' + Math.random().toString(36).substring(7);
}

/**
 * Show error message (use your existing toast/alert system)
 */
function showError(message) {
  // Your existing error/toast system
  if (window.showToast) {
    window.showToast(message, 'error');
  } else if (window.alert) {
    alert('❌ ' + message);
  } else {
    console.error(message);
  }
}

// ============================================================================
// STEP 6: Event Listeners Integration
// ============================================================================

/**
 * Listen for Cash App checkout events (optional)
 */
document.addEventListener('cashapp-checkout-success', (e) => {
  const { orderId, ticketId } = e.detail;
  console.log('✓ Cash App payment successful', { orderId, ticketId });

  // Update your app state
  if (window.appState) {
    window.appState.order = {
      id: orderId,
      ticket: ticketId,
      method: 'cashapp',
      status: 'completed',
    };
  }

  // Redirect to ticket view
  setTimeout(() => {
    window.location.href = `/tickets/${ticketId}`;
  }, 2000);
});

document.addEventListener('cashapp-checkout-error', (e) => {
  const { error } = e.detail;
  console.error('✗ Cash App payment error', error);
});

/**
 * Listen for WebSocket seat status updates
 */
if (window.socket) {
  window.socket.on('SEAT_STATUS_UPDATE', (update) => {
    console.log('Seat status updated:', update);

    // If seat is sold, disable it in UI
    if (update.status === 'SOLD') {
      disableSeatInUI(update.seatId);
    }

    // If seat is available again, enable it
    if (update.status === 'AVAILABLE') {
      enableSeatInUI(update.seatId);
    }
  });
}

// ============================================================================
// STEP 7: Optional - Custom Dispatch Events (for advanced integration)
// ============================================================================

/**
 * Dispatch custom event when payment method is selected
 * Usage: window.dispatchEvent(new CustomEvent('payment-initiated', {...}))
 */
function dispatchPaymentInitiated() {
  const event = new CustomEvent('payment-initiated', {
    detail: {
      method: 'cashapp',
      reservation: getCurrentReservation(),
      seat: getSelectedSeat(),
    },
  });
  window.dispatchEvent(event);
}

// ============================================================================
// STEP 8: Admin Dashboard Integration (Optional)
// ============================================================================

/**
 * If you want to add admin access to your main navigation:
 */
function setupAdminLink() {
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      // Check if user is admin
      const userRole = getUserRole(); // Your auth method
      
      if (userRole === 'admin') {
        window.open('/admin-dashboard.html', '_blank');
      } else {
        showError('You do not have permission to access admin dashboard');
      }
    });
  }
}

/**
 * Get user role from your auth system
 */
function getUserRole() {
  // From JWT token
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    return payload.role || 'user';
  }

  // From session
  const role = sessionStorage.getItem('userRole');
  return role || 'user';
}

// ============================================================================
// STEP 9: Testing & Debugging
// ============================================================================

/**
 * Development: Test the integration
 */
function testCashAppIntegration() {
  console.log('=== Testing Cash App Integration ===');

  // Test: Can we access the checkout?
  if (window.CashAppCheckout) {
    console.log('✓ CashAppCheckout class loaded');
  } else {
    console.error('✗ CashAppCheckout class NOT loaded');
    return;
  }

  // Test: Is it initialized?
  if (window.cashappCheckout) {
    console.log('✓ Cash App checkout initialized');
  } else {
    console.error('✗ Cash App checkout NOT initialized');
    return;
  }

  // Test: Can we get reservation?
  const res = getCurrentReservation();
  if (res) {
    console.log('✓ Current reservation found:', res);
  } else {
    console.warn('⚠️ No current reservation');
  }

  // Test: Can we get seat?
  const seat = getSelectedSeat();
  if (seat) {
    console.log('✓ Selected seat found:', seat);
  } else {
    console.warn('⚠️ No seat selected');
  }

  // Test: Backend connectivity
  fetch('/api/health')
    .then(r => r.json())
    .then(d => {
      if (d.status === 'ok') {
        console.log('✓ Backend API responding');
      } else {
        console.error('✗ Backend returned error:', d);
      }
    })
    .catch(err => {
      console.error('✗ Backend not reachable:', err.message);
    });

  console.log('=== Test Complete ===');
}

// Run test in console: testCashAppIntegration()

// ============================================================================
// STEP 10: Example Complete Page Integration
// ============================================================================

/*
<!-- Example HTML structure for your checkout page -->

<!DOCTYPE html>
<html>
<head>
  <title>Checkout - Novaden Tickets</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="cashapp-checkout.css">
</head>
<body>
  <!-- Existing seat selection -->
  <div id="seatSelectionMap">
    <!-- ... your existing map SVG ... -->
  </div>

  <!-- NEW: Payment method selector -->
  <div id="checkoutSection" style="display: none;">
    <h2>Choose Payment Method</h2>
    
    <button class="payment-button" data-payment-method="cashapp">
      💰 Cash App
    </button>
    
    <button class="payment-button" data-payment-method="stripe">
      💳 Credit Card
    </button>
  </div>

  <!-- Scripts -->
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script src="seat-selection.js"></script>
  <script src="cashapp-checkout.js"></script>
  <script src="integration.js"></script> <!-- This file -->
</body>
</html>
*/

// ============================================================================
// EXPORT for use in other modules
// ============================================================================

export {
  openCashAppCheckout,
  getCurrentReservation,
  getSelectedSeat,
  handlePaymentMethodSelection,
  testCashAppIntegration,
};
