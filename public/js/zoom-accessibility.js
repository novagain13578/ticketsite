/**
 * Zoom Accessibility Layer - Keyboard Navigation
 * Makes zoom interface keyboard accessible
 */

class ZoomAccessibility {
  constructor(zoomManager) {
    this.zoomManager = zoomManager;
    this.focusedSeatIndex = 0;
    this.seatList = [];
    
    this.setupKeyboardHandlers();
    this.announceState();
  }

  /**
   * Setup keyboard event handlers
   */
  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      if (!this.zoomManager.isZoomed) return;

      switch (e.key) {
        case 'Escape':
          this.zoomManager.resetZoom();
          this.announceState('Zoom reset. Returned to overview.');
          break;

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          this.navigateSeats(e.key);
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          this.selectFocusedSeat();
          break;

        case '+':
        case '=':
          e.preventDefault();
          this.zoomManager.currentZoom = Math.min(
            this.zoomManager.maxZoom,
            this.zoomManager.currentZoom * 1.2
          );
          this.announceState(`Zoomed to ${Math.round(this.zoomManager.currentZoom * 100)}%`);
          break;

        case '-':
          e.preventDefault();
          this.zoomManager.currentZoom = Math.max(
            this.zoomManager.minZoom,
            this.zoomManager.currentZoom * 0.8
          );
          if (this.zoomManager.currentZoom === 1) {
            this.zoomManager.resetZoom();
          }
          this.announceState(`Zoomed to ${Math.round(this.zoomManager.currentZoom * 100)}%`);
          break;

        case '?':
          e.preventDefault();
          this.showKeyboardHelp();
          break;
      }
    });
  }

  /**
   * Navigate between seats with arrow keys
   */
  navigateSeats(key) {
    if (this.zoomManager.renderedSeats.size === 0) return;

    // Build list of rendered seats
    this.seatList = Array.from(this.zoomManager.renderedSeats);

    // Calculate column/row for 2D navigation
    const columns = Math.ceil(Math.sqrt(this.seatList.length));

    switch (key) {
      case 'ArrowRight':
        this.focusedSeatIndex = (this.focusedSeatIndex + 1) % this.seatList.length;
        break;
      case 'ArrowLeft':
        this.focusedSeatIndex = (this.focusedSeatIndex - 1 + this.seatList.length) % this.seatList.length;
        break;
      case 'ArrowDown':
        this.focusedSeatIndex = Math.min(this.seatList.length - 1, this.focusedSeatIndex + columns);
        break;
      case 'ArrowUp':
        this.focusedSeatIndex = Math.max(0, this.focusedSeatIndex - columns);
        break;
    }

    this.focusSeat(this.seatList[this.focusedSeatIndex]);
  }

  /**
   * Focus on a specific seat (visual & announcement)
   */
  focusSeat(seatId) {
    const seatElement = this.zoomManager.seatElements.get(seatId);
    if (!seatElement) return;

    // Visual focus
    seatElement.style.stroke = '#ffe000';
    seatElement.style.strokeWidth = '3';

    // Announce to screen readers
    const seatData = JSON.parse(seatElement.getAttribute('data-seat-info'));
    this.announceState(
      `Focused: Row ${seatData.row}, Seat ${seatData.number}, Price: $${seatData.price}`
    );
  }

  /**
   * Select currently focused seat
   */
  selectFocusedSeat() {
    if (this.seatList.length === 0) return;

    const seatId = this.seatList[this.focusedSeatIndex];
    const seatElement = this.zoomManager.seatElements.get(seatId);
    if (!seatElement) return;

    const seatData = JSON.parse(seatElement.getAttribute('data-seat-info'));
    this.zoomManager.selectSeatFromZoom(seatId, seatData);

    this.announceState(`Selected: Row ${seatData.row}, Seat ${seatData.number}`);
  }

  /**
   * Announce state to screen readers
   */
  announceState(message = '') {
    const announcement = document.getElementById('a11yAnnouncement');
    if (!announcement) {
      const el = document.createElement('div');
      el.id = 'a11yAnnouncement';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(el);
    }

    const el = document.getElementById('a11yAnnouncement');
    if (message) {
      el.textContent = message;
    } else {
      const state = this.zoomManager.isZoomed 
        ? `Zoomed in to ${this.zoomManager.zoomedSection.name}. Use arrow keys to navigate seats, Enter to select, Escape to reset zoom.`
        : 'Zoom view not active. Click a section to zoom in.';
      el.textContent = state;
    }
  }

  /**
   * Show keyboard shortcut help
   */
  showKeyboardHelp() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5000;
    `;

    modal.innerHTML = `
      <div style="
        background: #fff;
        padding: 32px;
        border-radius: 12px;
        max-width: 500px;
        color: #333;
      ">
        <h2 style="margin-bottom: 16px;">Keyboard Shortcuts</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding:8px; font-weight:600;">Arrow Keys</td>
            <td style="padding:8px;">Navigate between seats</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding:8px; font-weight:600;">Enter / Space</td>
            <td style="padding:8px;">Select focused seat</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding:8px; font-weight:600;">+ / -</td>
            <td style="padding:8px;">Zoom in / out</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding:8px; font-weight:600;">Escape</td>
            <td style="padding:8px;">Reset zoom & return to overview</td>
          </tr>
          <tr>
            <td style="padding:8px; font-weight:600;">?</td>
            <td style="padding:8px;">Show this help</td>
          </tr>
        </table>
        <button style="
          margin-top: 24px;
          background: #1a4fc4;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
        " onclick="this.closest('div').parentElement.remove();">Close</button>
      </div>
    `;

    document.body.appendChild(modal);
  }
}

// Initialize accessibility when zoom manager loads
window.addEventListener('load', () => {
  if (window.zoomSeatManager) {
    window.zoomAccessibility = new ZoomAccessibility(window.zoomSeatManager);
  }
});
