/**
 * ADMIN DASHBOARD - Vanilla JavaScript
 * Manages Cash App payment approval workflow
 */

class AdminDashboard {
  constructor(options = {}) {
    this.config = {
      backendUrl: options.backendUrl || 'http://localhost:3000',
      autoRefreshInterval: 30000, // 30 seconds
      ...options,
    };

    this.state = {
      pending: [],
      selectedReservationId: null,
      isProcessing: false,
      autoRefreshTimer: null,
    };

    this.elements = {
      alertContainer: document.getElementById('alertContainer'),
      pendingList: document.getElementById('pendingList'),
      pendingCount: document.getElementById('pendingCount'),
      approvedCount: document.getElementById('approvedCount'),
      rejectionModal: document.getElementById('rejectionModal'),
      rejectionReason: document.getElementById('rejectionReason'),
    };

    this.init();
  }

  init() {
    this.loadPendingApprovals();
    // Auto-refresh every 30 seconds
    this.state.autoRefreshTimer = setInterval(() => {
      this.loadPendingApprovals();
    }, this.config.autoRefreshInterval);
  }

  /**
   * Load pending approvals from backend
   */
  async loadPendingApprovals() {
    try {
      const response = await fetch(
        `${this.config.backendUrl}/api/checkout/admin/pending-approvals`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // In production, include auth header: Authorization: Bearer ...
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load approvals');
      }

      this.state.pending = data.pending || [];
      this.elements.pendingCount.textContent = data.count || 0;

      this.renderPendingList();
      this.clearAlerts();

      if (data.count === 0) {
        this.showAlert('✓ All payments reviewed!', 'success');
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      this.showAlert(`❌ Error: ${error.message}`, 'error');
    }
  }

  /**
   * Render the list of pending approvals
   */
  renderPendingList() {
    if (this.state.pending.length === 0) {
      this.elements.pendingList.innerHTML = `
        <div class="empty-state">
          <div class="icon">✓</div>
          <p>No pending approvals. All payments have been reviewed!</p>
        </div>
      `;
      return;
    }

    this.elements.pendingList.innerHTML = this.state.pending
      .map((item) => this.createApprovalCard(item))
      .join('');

    // Attach event listeners to buttons
    this.state.pending.forEach((item) => {
      const approveBtn = document.querySelector(
        `[data-action="approve"][data-reservation-id="${item.reservationId}"]`
      );
      const rejectBtn = document.querySelector(
        `[data-action="reject"][data-reservation-id="${item.reservationId}"]`
      );

      if (approveBtn) {
        approveBtn.addEventListener('click', () =>
          this.approvePayment(item.reservationId)
        );
      }

      if (rejectBtn) {
        rejectBtn.addEventListener('click', () =>
          this.openRejectionModal(item.reservationId)
        );
      }
    });
  }

  /**
   * Create HTML for a single approval card
   */
  createApprovalCard(item) {
    const orderDate = new Date(item.createdAt).toLocaleString();
    const ticketCount = item.cart ? item.cart.length : 0;
    
    return `
      <div class="approval-card">
        <div class="approval-card-header">
          <div>
            <div class="approval-card-title">Order ID: ${item.reservation_id}</div>
            <div class="approval-card-meta">Initiated: ${orderDate}</div>
          </div>
          <span class="status-badge pending">${item.status}</span>
        </div>
        
        <div class="approval-details">
          <div class="detail-item">
            <span class="detail-label">Method</span>
            <span class="detail-value" style="text-transform: uppercase;">${item.method}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Total Amount</span>
            <span class="detail-value" style="color: var(--success); font-size: 16px;">$${Number(item.total).toFixed(2)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tickets</span>
            <span class="detail-value">${ticketCount} Ticket(s)</span>
          </div>
        </div>
        
        <div class="approval-actions" style="margin-top: 16px; grid-column: 1 / -1;">
          <button 
            class="btn btn-approve" 
            onclick="fillApprovalForm('${item.reservation_id}', '${item.method}')"
            style="background: var(--primary); width: auto; padding: 12px 24px;"
          >
            ⚡ Process Order
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Approve payment
   */
  async approvePayment(reservationId) {
    if (this.state.isProcessing) return;

    if (!confirm('Are you sure you want to approve this payment?')) {
      return;
    }

    try {
      this.state.isProcessing = true;

      const response = await fetch(
        `${this.config.backendUrl}/api/admin/approve-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservation_id: reservationId,
            admin_id: 'admin_dashboard_user', // In production, get from auth
            approval_note: 'Payment verified by admin',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment approval failed');
      }

      this.showAlert(`✓ Payment approved! Order: ${data.orderId}`, 'success');

      // Remove the approved item from the list
      this.state.pending = this.state.pending.filter(
        (item) => item.reservationId !== reservationId
      );

      this.renderPendingList();
      this.elements.pendingCount.textContent = this.state.pending.length;

      // Increment approved count
      const approvedCount = parseInt(
        this.elements.approvedCount.textContent || '0'
      );
      this.elements.approvedCount.textContent = approvedCount + 1;
    } catch (error) {
      console.error('Error approving payment:', error);
      this.showAlert(`❌ Approval failed: ${error.message}`, 'error');
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Open rejection modal
   */
  openRejectionModal(reservationId) {
    this.state.selectedReservationId = reservationId;
    this.elements.rejectionReason.value = '';
    this.elements.rejectionModal.classList.add('active');
  }

  /**
   * Close rejection modal
   */
  closeRejectionModal() {
    this.elements.rejectionModal.classList.remove('active');
    this.state.selectedReservationId = null;
    this.elements.rejectionReason.value = '';
  }

  /**
   * Confirm rejection with reason
   */
  async confirmRejectPayment() {
    const reason = this.elements.rejectionReason.value.trim();

    if (!reason) {
      this.showAlert('❌ Please provide a rejection reason', 'error');
      return;
    }

    await this.rejectPayment(this.state.selectedReservationId, reason);
    this.closeRejectionModal();
  }

  /**
   * Reject payment
   */
  async rejectPayment(reservationId, rejectionReason) {
    if (this.state.isProcessing) return;

    try {
      this.state.isProcessing = true;

      const response = await fetch(
        `${this.config.backendUrl}/api/admin/reject-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservation_id: reservationId,
            admin_id: 'admin_dashboard_user', // In production, get from auth
            rejection_reason: rejectionReason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment rejection failed');
      }

      this.showAlert(
        `✓ Payment rejected. Seat ${data.seatId} released to public.`,
        'success'
      );

      // Remove the rejected item from the list
      this.state.pending = this.state.pending.filter(
        (item) => item.reservationId !== reservationId
      );

      this.renderPendingList();
      this.elements.pendingCount.textContent = this.state.pending.length;
    } catch (error) {
      console.error('Error rejecting payment:', error);
      this.showAlert(`❌ Rejection failed: ${error.message}`, 'error');
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * Show alert message
   */
  showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;

    const icons = {
      success: '✓',
      error: '⚠️',
      info: 'ℹ️',
    };

    alertDiv.innerHTML = `${icons[type]} ${message}`;

    this.elements.alertContainer.innerHTML = '';
    this.elements.alertContainer.appendChild(alertDiv);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, 5000);
  }

  /**
   * Clear all alerts
   */
  clearAlerts() {
    this.elements.alertContainer.innerHTML = '';
  }

  /**
   * Destroy dashboard (cleanup)
   */
  destroy() {
    clearInterval(this.state.autoRefreshTimer);
  }
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard({
    backendUrl: 'http://localhost:3000', // Update with your backend URL
  });
});

// ============================================================================
// AUTO-FILL FORM HELPER
// ============================================================================

window.fillApprovalForm = function(reservationId, method) {
  // Auto-fill the top form
  document.getElementById('reservationId').value = reservationId;
  
  // Scroll to the top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Highlight the payment tag input
  document.getElementById('paymentTag').focus();
  
  // Optional: Show a quick toast notification
  const container = document.getElementById('checkoutAlertContainer');
  if (container) {
    container.innerHTML = `<div class="alert alert-info" style="background: #e3f2fd; border: 1px solid #90caf9; color: #1565c0;">Processing ${method.toUpperCase()} order: ${reservationId}</div>`;
    setTimeout(() => container.innerHTML = '', 3000);
  }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.adminDashboard) {
    window.adminDashboard.destroy();
  }
});
