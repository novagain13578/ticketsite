/**
 * CASH APP CHECKOUT FLOW - Vanilla JavaScript
 * Handles the complete Cash App payment process:
 * 1. Generate payment details (fetch $Cashtag)
 * 2. Copy Cashtag to clipboard
 * 3. Upload proof of payment screenshot
 * 4. Pause TTL during admin verification
 */

class CashAppCheckout {
  constructor(options = {}) {
    this.config = {
      backendUrl: options.backendUrl || '',
      timeoutSeconds: 600, // 10 minutes for TTL
      maxFileSize: 5 * 1024 * 1024, // 5MB
      ...options,
    };

    this.state = {
      current_stage: 1, // 1, 2, or 3
      reservation_id: null,
      cashtag: null,
      seat_details: null,
      file_selected: false,
      is_processing: false,
      countdown_interval: null,
    };

    this.elements = {
      modal: document.getElementById('cashappModal'),
      closeBtn: document.getElementById('modalCloseBtn'),
      stage1: document.getElementById('stage1'),
      stage2: document.getElementById('stage2'),
      stage3: document.getElementById('stage3'),
      generatePaymentBtn: document.getElementById('generatePaymentBtn'),
      cashtag: document.getElementById('cashtag'),
      copyCashtagBtn: document.getElementById('copyCashtagBtn'),
      transferredBtn: document.getElementById('transferredBtn'),
      uploadZone: document.getElementById('uploadZone'),
      screenshotInput: document.getElementById('screenshotInput'),
      uploadForm: document.getElementById('uploadForm'),
      submitUploadBtn: document.getElementById('submitUploadBtn'),
      filePreview: document.getElementById('filePreview'),
      previewImage: document.getElementById('previewImage'),
      alertContainer: document.getElementById('alertContainer'),
      progressSteps: [
        document.getElementById('progressStep1'),
        document.getElementById('progressStep2'),
        document.getElementById('progressStep3'),
      ],
    };

    this.init();
  }

  init() {
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Close modal
    this.elements.closeBtn.addEventListener('click', () => this.closeModal());
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) this.closeModal();
    });

    // Stage 1: Generate payment details
    this.elements.generatePaymentBtn.addEventListener('click', () =>
      this.generatePaymentDetails()
    );

    // Stage 2: Copy cashtag & transfer confirmation
    this.elements.copyCashtagBtn.addEventListener('click', () =>
      this.copyToClipboard()
    );
    this.elements.transferredBtn.addEventListener('click', () =>
      this.moveToStage3()
    );

    // Stage 3: File upload
    this.elements.uploadZone.addEventListener('click', () => {
      this.elements.screenshotInput.click();
    });

    this.elements.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.add('dragover');
    });

    this.elements.uploadZone.addEventListener('dragleave', () => {
      this.elements.uploadZone.classList.remove('dragover');
    });

    this.elements.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });

    this.elements.screenshotInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    this.elements.uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitUploadProof();
    });
  }

  /**
   * STAGE 1: Generate Payment Details
   * Fetch the active Cash App $Cashtag from backend
   */
  async generatePaymentDetails() {
    try {
      this.showLoadingAlert('⏳ Generating payment details...');
      this.elements.generatePaymentBtn.disabled = true;

      const response = await fetch(
        `${this.config.backendUrl}/api/cashapp/payment-details`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservation_id: this.state.reservation_id,
            event_id: this.config.eventId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate payment details');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Payment details generation failed');
      }

      // Store cashtag and move to stage 2
      this.state.cashtag = data.cashtag;
      this.elements.cashtag.textContent = data.cashtag;

      this.clearAlerts();
      this.moveToStage2();
    } catch (error) {
      console.error('Error generating payment details:', error);
      this.showErrorAlert(`❌ ${error.message}`);
    } finally {
      this.elements.generatePaymentBtn.disabled = false;
    }
  }

  /**
   * Move to Stage 2: Display Cashtag
   */
  moveToStage2() {
    this.state.current_stage = 2;
    this.hideAllStages();
    this.elements.stage2.style.display = 'flex';

    // Update progress indicators
    this.updateProgressIndicators(2);

    // Start countdown timer
    this.startCountdownTimer();

    // Update modal subtitle
    document.getElementById('modalSubtitle').textContent = 'Send payment to your Cash App account';
  }

  /**
   * Copy Cashtag to Clipboard
   */
  async copyToClipboard() {
    try {
      const text = this.elements.cashtag.textContent;
      await navigator.clipboard.writeText(text);

      // Visual feedback
      const btn = this.elements.copyCashtagBtn;
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.style.background = 'var(--success)';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
      }, 2000);

      this.showSuccessAlert('✓ $Cashtag copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.showErrorAlert('❌ Failed to copy to clipboard');
    }
  }

  /**
   * Move to Stage 3: Upload Proof
   */
  moveToStage3() {
    this.state.current_stage = 3;
    this.hideAllStages();
    this.elements.stage3.style.display = 'flex';

    // Update progress indicators
    this.updateProgressIndicators(3);

    // Update modal subtitle
    document.getElementById('modalSubtitle').textContent = 'Upload proof of your payment';

    this.clearAlerts();
  }

  /**
   * Handle file selection and preview
   */
  handleFileSelect(file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
      this.showErrorAlert('❌ Please select an image file');
      return;
    }

    if (file.size > this.config.maxFileSize) {
      this.showErrorAlert(`❌ File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    // Store file
    this.state.selected_file = file;
    this.state.file_selected = true;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.previewImage.src = e.target.result;
      this.elements.filePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Enable submit button
    this.elements.submitUploadBtn.disabled = false;
    this.showSuccessAlert(`✓ File selected: ${file.name}`);
  }

  /**
   * Submit upload proof form
   * Uses FormData to send multipart/form-data
   */
  async submitUploadProof() {
    if (!this.state.file_selected) {
      this.showErrorAlert('❌ Please select a file first');
      return;
    }

    try {
      this.state.is_processing = true;
      this.elements.submitUploadBtn.disabled = true;
      this.elements.submitUploadBtn.innerHTML =
        '<span class="spinner"></span> Submitting...';

      // Create FormData
      const formData = new FormData();
      formData.append('screenshot', this.state.selected_file);
      formData.append('reservation_id', this.state.reservation_id);
      formData.append('event_id', this.config.eventId);

      // Send to backend
      const response = await fetch(
        `${this.config.backendUrl}/api/cashapp/upload-proof`,
        {
          method: 'POST',
          body: formData,
          // Note: Don't set Content-Type header - browser will set it correctly with boundary
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      if (!data.success) {
        throw new Error(data.message || 'Upload verification failed');
      }

      // Success: Show confirmation
      this.showSuccessAlert(
        '✓ Proof uploaded successfully! Awaiting admin verification...'
      );

      // Disable further interaction temporarily
      this.elements.uploadForm.style.pointerEvents = 'none';
      this.elements.uploadForm.style.opacity = '0.6';

      // Auto-close modal after 3 seconds
      setTimeout(() => {
        this.closeModal();
      }, 3000);
    } catch (error) {
      console.error('Error uploading proof:', error);
      this.showErrorAlert(`❌ ${error.message}`);
    } finally {
      this.state.is_processing = false;
      this.elements.submitUploadBtn.disabled = false;
      this.elements.submitUploadBtn.innerHTML = 'Submit Payment Proof';
    }
  }

  /**
   * Start 10-minute countdown timer
   */
  startCountdownTimer() {
    const endTime = new Date().getTime() + this.config.timeoutSeconds * 1000;

    const updateTimer = () => {
      const now = new Date().getTime();
      const timeLeft = endTime - now;

      if (timeLeft <= 0) {
        clearInterval(this.state.countdown_interval);
        this.showErrorAlert(
          '⚠️ Reservation expired. Please select the seat again.'
        );
        setTimeout(() => this.closeModal(), 2000);
        return;
      }

      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      const display = `${minutes}:${String(seconds).padStart(2, '0')}`;

      // Update timer display (if it exists in the DOM)
      const timerElement = document.querySelector('.timer-value');
      if (timerElement) {
        timerElement.textContent = display;
      }

      // Add warning styling when under 2 minutes
      if (timeLeft < 2 * 60 * 1000) {
        // Timer is in critical state
        console.warn('⚠️ Less than 2 minutes remaining for payment');
      }
    };

    updateTimer();
    this.state.countdown_interval = setInterval(updateTimer, 1000);
  }

  /**
   * Open modal with seat details
   */
  open(options = {}) {
    const { reservation_id, seat_details, event_id } = options;

    this.state.reservation_id = reservation_id;
    this.state.seat_details = seat_details;
    this.config.eventId = event_id;

    // Populate seat info
    if (seat_details) {
      document.getElementById('seatSection').textContent = seat_details.section;
      document.getElementById('seatRow').textContent = seat_details.row.toUpperCase();
      document.getElementById('seatNumber').textContent = seat_details.number;
      document.getElementById('seatPrice').textContent = `$${seat_details.price.toFixed(2)}`;
      document.getElementById('amountToSend').textContent = `$${seat_details.price.toFixed(2)}`;
    }

    // Show modal
    this.elements.modal.classList.add('active');

    // Reset to stage 1
    this.state.current_stage = 1;
    this.hideAllStages();
    this.elements.stage1.style.display = 'flex';
    this.updateProgressIndicators(1);
  }

  /**
   * Close modal
   */
  closeModal() {
    this.elements.modal.classList.remove('active');
    clearInterval(this.state.countdown_interval);
    this.resetState();
  }

  /**
   * Helper: Hide all stages
   */
  hideAllStages() {
    this.elements.stage1.style.display = 'none';
    this.elements.stage2.style.display = 'none';
    this.elements.stage3.style.display = 'none';
  }

  /**
   * Helper: Update progress indicators
   */
  updateProgressIndicators(currentStep) {
    this.elements.progressSteps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index + 1 < currentStep) {
        step.classList.add('completed');
      } else if (index + 1 === currentStep) {
        step.classList.add('active');
      }
    });
  }

  /**
   * Helper: Show alert message
   */
  showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;

    const icons = {
      success: '✓',
      error: '⚠️',
      loading: '⏳',
      info: 'ℹ️',
    };

    alertDiv.innerHTML = `
      <div class="alert-icon">${icons[type]}</div>
      <div>${message}</div>
    `;

    this.elements.alertContainer.innerHTML = '';
    this.elements.alertContainer.appendChild(alertDiv);
  }

  showSuccessAlert(message) {
    this.showAlert(message, 'success');
  }

  showErrorAlert(message) {
    this.showAlert(message, 'error');
  }

  showLoadingAlert(message) {
    this.showAlert(message, 'loading');
  }

  clearAlerts() {
    this.elements.alertContainer.innerHTML = '';
  }

  /**
   * Helper: Reset state
   */
  resetState() {
    this.state = {
      current_stage: 1,
      reservation_id: null,
      cashtag: null,
      seat_details: null,
      file_selected: false,
      is_processing: false,
      countdown_interval: null,
    };
    this.elements.filePreview.style.display = 'none';
    this.elements.submitUploadBtn.disabled = true;
    this.elements.screenshotInput.value = '';
    this.clearAlerts();
  }
}

// Export for global use
window.CashAppCheckout = CashAppCheckout;

// Auto-initialize if on the checkout page
document.addEventListener('DOMContentLoaded', () => {
  window.cashappCheckout = new CashAppCheckout({
    backendUrl: '', // Uses relative paths for both dev and production
  });
});
