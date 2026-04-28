/**
 * SVG Viewport Engine - Integration Examples
 * Practical code snippets to integrate the new zoom system into your application
 */

// ============================================================================
// EXAMPLE 1: Initialize viewport and monitor zoom state
// ============================================================================

function initializeViewportMonitoring() {
  // Manager auto-initializes, access via global
  const manager = window.zoomSeatManager;

  // Poll zoom state every 200ms for debugging/analytics
  setInterval(() => {
    const state = manager.state;
    const transform = manager.getCurrentTransform();

    console.log(`
      🔍 Viewport State
      ├─ Scale: ${state.scale.toFixed(2)}x
      ├─ Position: (${state.x.toFixed(0)}, ${state.y.toFixed(0)})
      ├─ LoD Active: ${manager.seatsRendered}
      └─ Seats Rendered: ${manager.renderedSeats.size}
    `);
  }, 200);
}

// ============================================================================
// EXAMPLE 2: Listen for seat selection and update cart
// ============================================================================

function setupSeatSelectionListener() {
  document.addEventListener('zoom:seat-selected', (e) => {
    const seatId = e.detail.seatId;
    
    console.log(`✅ Seat selected: ${seatId}`);

    // Add to cart
    const seatData = {
      id: seatId,
      section: 'Section A', // Parse from seatId
      row: 'Row 10',
      number: 1,
      price: 150,
      selectedAt: new Date().toISOString()
    };

    // Update your cart manager
    cartManager.addItem(seatData);

    // Update UI
    updateCartSummary();
    highlightSelectedSeat(seatId);
  });
}

// ============================================================================
// EXAMPLE 3: Custom zoom-to-section trigger (button click)
// ============================================================================

function setupZoomButtons() {
  const buttons = document.querySelectorAll('[data-zoom-to-section]');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.zoomToSection;
      const sectionName = btn.dataset.sectionName;

      // Find the SVG section element
      const manager = window.zoomSeatManager;
      const svg = manager.svg;
      const section = svg.querySelector(`[data-section-id="${sectionId}"]`);

      if (section) {
        // Zoom to it with 10% padding
        manager.zoomToElement(section, sectionId, sectionName);
      } else {
        console.warn(`Section ${sectionId} not found`);
      }
    });
  });
}

// ============================================================================
// EXAMPLE 4: Programmatic zoom control (keyboard shortcuts)
// ============================================================================

function setupKeyboardZoomControl() {
  const manager = window.zoomSeatManager;

  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case '+':
      case '=':
        e.preventDefault();
        // Zoom in by 1.2x at viewport center
        const centerX = manager.viewport.offsetWidth / 2;
        const centerY = manager.viewport.offsetHeight / 2;

        const zoomDelta = 1.2;
        const newScale = Math.min(4, manager.state.scale * zoomDelta);

        manager.target.x = centerX - (centerX - manager.state.x) * (newScale / manager.state.scale);
        manager.target.y = centerY - (centerY - manager.state.y) * (newScale / manager.state.scale);
        manager.target.scale = newScale;
        manager.isAnimating = true;
        manager.startAnimationLoop();

        console.log(`⬆️ Zoom in to ${newScale.toFixed(2)}x`);
        break;

      case '-':
        e.preventDefault();
        // Zoom out by 0.83x (1/1.2)
        const zoomOut = 0.83;
        const newScaleOut = Math.max(1, manager.state.scale * zoomOut);

        manager.target.x = centerX - (centerX - manager.state.x) * (newScaleOut / manager.state.scale);
        manager.target.y = centerY - (centerY - manager.state.y) * (newScaleOut / manager.state.scale);
        manager.target.scale = newScaleOut;
        manager.isAnimating = true;
        manager.startAnimationLoop();

        console.log(`⬇️ Zoom out to ${newScaleOut.toFixed(2)}x`);
        break;

      case '0':
        e.preventDefault();
        // Reset zoom to 1x
        manager.resetZoom();
        console.log('↩️ Reset zoom to 1x');
        break;
    }
  });
}

// ============================================================================
// EXAMPLE 5: LoD-aware analytics (track when seats become visible)
// ============================================================================

function setupLoDAnaIytics() {
  const manager = window.zoomSeatManager;
  let lastLoD = false;

  // Check LoD state every 100ms
  setInterval(() => {
    const currentLoD = manager.seatsRendered;

    // Detect transition
    if (currentLoD && !lastLoD) {
      console.log('📊 [ANALYTICS] Seats became visible (LoD injected)');
      // Track event: zoom_detail_level_1
      // Send to analytics: { event: 'zoom_lod_change', level: 'detailed', scale: manager.state.scale }
    } else if (!currentLoD && lastLoD) {
      console.log('📊 [ANALYTICS] Seats hidden (LoD cleaned)');
      // Track event: zoom_detail_level_0
    }

    lastLoD = currentLoD;
  }, 100);
}

// ============================================================================
// EXAMPLE 6: Custom rect select (drag to select multiple seats)
// ============================================================================

function setupRectangleSelection() {
  const manager = window.zoomSeatManager;
  const viewport = manager.viewport;
  let isSelecting = false;
  let startX = 0, startY = 0;
  let selectionRect = null;

  viewport.addEventListener('mousedown', (e) => {
    // Only activate when zoomed in and seats are visible
    if (!manager.seatsRendered) return;

    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    // Create visual selection rectangle
    selectionRect = document.createElement('div');
    selectionRect.style.cssText = `
      position: fixed;
      border: 2px dashed #2196F3;
      background: rgba(33, 150, 243, 0.1);
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(selectionRect);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isSelecting || !selectionRect) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionRect.style.left = `${left}px`;
    selectionRect.style.top = `${top}px`;
    selectionRect.style.width = `${width}px`;
    selectionRect.style.height = `${height}px`;
  });

  document.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;

    isSelecting = false;

    // Get seats within selection rectangle
    const selectedSeats = [];
    manager.seatElements.forEach((element, seatId) => {
      const rect = element.getBoundingClientRect();
      const selectionBounds = selectionRect.getBoundingClientRect();

      if (rect.left >= selectionBounds.left &&
          rect.right <= selectionBounds.right &&
          rect.top >= selectionBounds.top &&
          rect.bottom <= selectionBounds.bottom) {
        selectedSeats.push(seatId);
      }
    });

    console.log(`✅ Selected ${selectedSeats.length} seats:`, selectedSeats);

    // Remove selection rect
    if (selectionRect && selectionRect.parentNode) {
      selectionRect.parentNode.removeChild(selectionRect);
    }
    selectionRect = null;

    // Add to cart
    selectedSeats.forEach(seatId => {
      document.dispatchEvent(new CustomEvent('zoom:seat-selected', { detail: { seatId } }));
    });
  });
}

// ============================================================================
// EXAMPLE 7: Touch gesture hints (show user how to interact)
// ============================================================================

function showTouchGestureHints() {
  const manager = window.zoomSeatManager;
  const viewport = manager.viewport;

  // Show hints on first touch
  let touchStarted = false;

  viewport.addEventListener('touchstart', () => {
    if (touchStarted) return;
    touchStarted = true;

    const hint = document.createElement('div');
    hint.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 1000;
      ">
        👉 Use two fingers to pinch-zoom
      </div>
    `;

    document.body.appendChild(hint);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (hint.parentNode) {
        hint.parentNode.removeChild(hint);
      }
    }, 3000);
  }, { once: true });
}

// ============================================================================
// EXAMPLE 8: Zoom state persistence (save/restore)
// ============================================================================

function setupZoomPersistence() {
  const manager = window.zoomSeatManager;
  const STORAGE_KEY = 'concert_zoom_state';

  // Save zoom state every 500ms
  setInterval(() => {
    const state = {
      x: manager.state.x,
      y: manager.state.y,
      scale: manager.state.scale,
      timestamp: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 500);

  // Restore zoom state on load (optional)
  function restoreZoomState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const state = JSON.parse(saved);

      // Don't restore if older than 1 hour
      if (Date.now() - state.timestamp > 3600000) return;

      manager.target = { x: state.x, y: state.y, scale: state.scale };
      manager.isAnimating = true;
      manager.startAnimationLoop();

      console.log('↩️ Restored zoom state');
    } catch (e) {
      console.error('Failed to restore zoom state:', e);
    }
  }

  // Call on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreZoomState);
  } else {
    restoreZoomState();
  }
}

// ============================================================================
// EXAMPLE 9: Responsive viewport sizing
// ============================================================================

function setupResponsiveViewport() {
  const manager = window.zoomSeatManager;
  const viewport = manager.viewport;

  // Update zoom limits based on viewport size
  function updateZoomLimits() {
    const width = viewport.offsetWidth;
    const height = viewport.offsetHeight;
    const minDimension = Math.min(width, height);

    // Adjust max zoom based on screen size
    if (minDimension < 400) {
      manager.maxScale = 3; // Smaller screens, less zoom
    } else if (minDimension < 768) {
      manager.maxScale = 3.5; // Tablet
    } else {
      manager.maxScale = 4; // Desktop
    }

    console.log(`📱 Updated max zoom to ${manager.maxScale}x for ${minDimension}px viewport`);
  }

  updateZoomLimits();

  // Update on window resize
  window.addEventListener('resize', () => {
    updateZoomLimits();
  });
}

// ============================================================================
// EXAMPLE 10: Debug panel (real-time visualization)
// ============================================================================

function createDebugPanel() {
  const manager = window.zoomSeatManager;

  const panel = document.createElement('div');
  panel.id = 'zoomDebugPanel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: #0f0;
    font-family: monospace;
    font-size: 12px;
    padding: 12px;
    border-radius: 6px;
    z-index: 9999;
    line-height: 1.6;
    max-width: 250px;
  `;

  document.body.appendChild(panel);

  // Update every 100ms
  const updateInterval = setInterval(() => {
    const state = manager.state;
    const target = manager.target;

    panel.innerHTML = `
      <strong>🔍 Zoom Debug</strong><br/>
      ├─ State Scale: ${state.scale.toFixed(3)}x<br/>
      ├─ Target Scale: ${target.scale.toFixed(3)}x<br/>
      ├─ Position: (${state.x.toFixed(0)}, ${state.y.toFixed(0)})<br/>
      ├─ LoD Active: ${manager.seatsRendered ? '✅' : '❌'}<br/>
      ├─ Seats: ${manager.renderedSeats.size}<br/>
      ├─ Animating: ${manager.isAnimating ? '🔄' : '⏸️'}<br/>
      └─ Viewport: ${manager.viewport.offsetWidth}x${manager.viewport.offsetHeight}<br/>
      <br/>
      <em>Press 'D' to close, '+/-' to zoom</em>
    `;
  }, 100);

  // Close with 'D' key
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
      clearInterval(updateInterval);
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
    }
  });
}

// ============================================================================
// INITIALIZATION - Call from your app
// ============================================================================

// When your app loads:
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📦 SVG Viewport Engine ready');

    // Initialize features
    initializeViewportMonitoring();
    setupSeatSelectionListener();
    setupZoomButtons();
    setupKeyboardZoomControl();
    setupLoDAnaIytics();
    setupRectangleSelection();
    showTouchGestureHints();
    setupZoomPersistence();
    setupResponsiveViewport();

    // Optional: Show debug panel
    // createDebugPanel(); // Uncomment to enable
  });
} else {
  console.log('📦 SVG Viewport Engine ready');
  // ... same initialization ...
}

// ============================================================================
// END EXAMPLES
// ============================================================================

/**
 * Summary of Examples:
 * 
 * 1. Monitor zoom state in real-time
 * 2. Listen for seat selections and update cart
 * 3. Add zoom buttons to UI
 * 4. Keyboard shortcuts (+ / - / 0)
 * 5. Track LoD transitions with analytics
 * 6. Multi-seat selection with drag rectangle
 * 7. Show touch gesture hints on mobile
 * 8. Save/restore zoom state with localStorage
 * 9. Responsive viewport sizing
 * 10. Debug panel for development
 *
 * Mix and match these examples to build your custom zoom UI!
 */
