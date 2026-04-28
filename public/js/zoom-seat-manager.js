/**
 * High-Performance SVG Viewport Engine with Level of Detail (LoD) Rendering
 * Implements Ticketmaster-style smooth zoom with dynamic seat injection
 */

class ZoomSeatManager extends DesktopSeatManager {
  constructor() {
    super();
    
    // ========== VIEWPORT & STAGE ==========
    this.viewport = null;
    this.stage = null;
    this.svg = null;
    
    // SVG Coordinate System (internal coordinates)
    this.svgWidth = 10240;
    this.svgHeight = 7680;
    
    // ========== ANIMATION STATE ==========
    // Current state (actual position/scale)
    this.state = { x: 0, y: 0, scale: 1 };
    
    // Target state (where we're animating to)
    this.target = { x: 0, y: 0, scale: 1 };
    
    // Animation parameters
    this.EASE = 0.12; // Controls springiness (0-1, lower = smoother, slower)
    this.SCALE_EASE = 0.10; // Slightly more conservative for scale
    this.animationFrameId = null;
    this.isAnimating = false;
    
    // ========== ZOOM CONSTRAINTS ==========
    this.minScale = 1;
    this.maxScale = 4;
    
    // ========== LEVEL OF DETAIL (LoD) ==========
    this.LoD_THRESHOLD = 2.5; // Render seats when scale >= 2.5
    this.seatsRendered = false;
    this.activeContainer = null; // Currently zoomed container
    this.renderedSeats = new Set();
    this.seatElements = new Map();
    
    // ========== GESTURE TRACKING ==========
    this.lastTouchDistance = 0;
    this.panStartState = null;
    
    // ========== INITIALIZATION ==========
    this.initialized = false;
    this.initializeViewport();
  }

  /**
   * Initialize the viewport and stage for high-performance zooming
   */
  initializeViewport() {
    const attemptInit = () => {
      // Get or create viewport (fixed-size container)
      this.viewport = document.getElementById('desktopMapMount') || 
                      document.querySelector('.map-container');
      
      if (!this.viewport) {
        console.warn('⚠️ Viewport container not found. Retrying...');
        setTimeout(attemptInit, 500);
        return;
      }

      // Get SVG (or wait for it)
      let svg = this.viewport.querySelector('svg');
      if (!svg) {
        console.warn('⚠️ SVG not found in viewport. Retrying...');
        setTimeout(attemptInit, 500);
        return;
      }

      this.svg = svg;
      this.stage = svg; // Stage = the SVG element itself

      // Configure viewport for overflow
      this.viewport.style.overflow = 'hidden';
      this.viewport.style.position = 'relative';
      this.viewport.style.touchAction = 'none'; // Prevent browser gestures

      // Configure stage for performant transforms
      this.stage.style.transformOrigin = '0 0';
      this.stage.style.willChange = 'transform';
      this.stage.style.cursor = 'grab';

      // Ensure viewBox is set
      if (!this.stage.getAttribute('viewBox')) {
        this.stage.setAttribute('viewBox', `0 0 ${this.svgWidth} ${this.svgHeight}`);
      }

      try {
        // Setup all interaction handlers
        this.setupGestureHandlers();
        this.attachSectionClickHandlers();
        this.startAnimationLoop();

        this.initialized = true;
        console.log('✅ High-Performance Viewport Engine initialized');
      } catch (e) {
        console.error('❌ Viewport initialization error:', e);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(attemptInit, 100);
      });
    } else {
      setTimeout(attemptInit, 100);
    }
  }

  /**
   * Smooth Animation Loop (requestAnimationFrame)
   * Applies interpolated state to DOM every frame using transform
   */
  startAnimationLoop() {
    const animate = () => {
      // Linear interpolation (Lerp) to target values
      this.state.x += (this.target.x - this.state.x) * this.EASE;
      this.state.y += (this.target.y - this.state.y) * this.EASE;
      this.state.scale += (this.target.scale - this.state.scale) * this.SCALE_EASE;

      // Apply transform to stage (SVG element)
      // transform-origin: 0 0, will-change: transform for performance
      if (this.stage) {
        this.stage.style.transform = `translate(${this.state.x}px, ${this.state.y}px) scale(${this.state.scale})`;
      }

      // Check Level of Detail threshold and trigger seat injection
      this.checkLoD();

      // Continue animation if still not at target
      if (Math.abs(this.target.scale - this.state.scale) > 0.001 ||
          Math.abs(this.target.x - this.state.x) > 0.1 ||
          Math.abs(this.target.y - this.state.y) > 0.1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Setup gesture handlers for wheel and pinch-to-zoom
   * Implements zoom-to-point formula: newX = mouseX - (mouseX - oldX) * (newScale / oldScale)
   */
  setupGestureHandlers() {
    if (!this.viewport) return;

    // ===== WHEEL ZOOM =====
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();

      // Calculate zoom factor from wheel delta
      const zoomDelta = e.deltaY > 0 ? 0.92 : 1.09;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.state.scale * zoomDelta));

      // Get mouse position relative to viewport (screen coordinates)
      const rect = this.viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Apply zoom-to-point formula to keep point stationary in screen space
      // newX = mouseX - (mouseX - oldX) * (newScale / oldScale)
      const oldX = this.state.x;
      const oldY = this.state.y;
      const oldScale = this.state.scale;

      this.target.x = mouseX - (mouseX - oldX) * (newScale / oldScale);
      this.target.y = mouseY - (mouseY - oldY) * (newScale / oldScale);
      this.target.scale = newScale;

      this.isAnimating = true;
      this.startAnimationLoop();
    }, { passive: false });

    // ===== TOUCH PINCH-TO-ZOOM =====
    this.viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        this.lastTouchDistance = Math.hypot(dx, dy);
      }
    }, { passive: true });

    this.viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.hypot(dx, dy);

      if (this.lastTouchDistance > 0) {
        const zoomDelta = currentDistance / this.lastTouchDistance;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.state.scale * zoomDelta));

        // Center point between two fingers (screen coordinates)
        const rect = this.viewport.getBoundingClientRect();
        const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

        // Apply zoom-to-point formula with center point
        const oldX = this.state.x;
        const oldY = this.state.y;
        const oldScale = this.state.scale;

        this.target.x = centerX - (centerX - oldX) * (newScale / oldScale);
        this.target.y = centerY - (centerY - oldY) * (newScale / oldScale);
        this.target.scale = newScale;

        this.isAnimating = true;
        this.startAnimationLoop();
      }

      this.lastTouchDistance = currentDistance;
    }, { passive: false });

    this.viewport.addEventListener('touchend', () => {
      this.lastTouchDistance = 0;
    }, { passive: true });
  }

  /**
   * Attach section click handlers for section-level zoom
   */
  attachSectionClickHandlers() {
    if (!this.svg) return;

    const sections = this.svg.querySelectorAll('.block.is-available[data-section-id]');
    
    console.log(`📍 Found ${sections.length} clickable sections`);

    sections.forEach((section) => {
      section.style.cursor = 'pointer';
      
      section.addEventListener('click', (e) => {
        e.stopPropagation();
        const sectionId = section.getAttribute('data-section-id');
        const sectionName = section.getAttribute('data-section-name');
        
        console.log(`🔍 Zooming to section: ${sectionName}`);
        this.zoomToElement(section, sectionId, sectionName);
      });

      // Hover effect
      section.addEventListener('mouseenter', () => {
        section.style.opacity = '0.8';
      });

      section.addEventListener('mouseleave', () => {
        section.style.opacity = '1';
      });
    });
  }

  /**
   * Calculate bounding box of element and animate zoom to fit in viewport with 10% padding
   */
  zoomToElement(element, sectionId, sectionName) {
    if (this.isAnimating) return;

    // Get bounding box of element in SVG coordinates
    let bbox;
    try {
      bbox = element.getBBox();
    } catch (e) {
      console.error('❌ Could not get bBox:', e);
      return;
    }

    if (!bbox || bbox.width === 0 || bbox.height === 0) {
      console.warn('⚠️ Invalid bbox');
      return;
    }

    // Get viewport dimensions (screen coordinates)
    const viewportWidth = this.viewport.offsetWidth;
    const viewportHeight = this.viewport.offsetHeight;

    // Add 10% padding to bounding box
    const padding = Math.max(bbox.width, bbox.height) * 0.1;
    const paddedBox = {
      x: bbox.x - padding,
      y: bbox.y - padding,
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2
    };

    // Calculate scale to fit padded box into viewport
    const scaleX = viewportWidth / paddedBox.width;
    const scaleY = viewportHeight / paddedBox.height;
    const newScale = Math.min(scaleX, scaleY, this.maxScale);

    // Calculate translation to center the box in viewport
    const newX = (viewportWidth / 2) - (paddedBox.x + paddedBox.width / 2) * newScale;
    const newY = (viewportHeight / 2) - (paddedBox.y + paddedBox.height / 2) * newScale;

    console.log(`🎯 Zoom section: scale=${newScale.toFixed(2)}x, translate=(${newX.toFixed(0)}, ${newY.toFixed(0)})`);

    // Set target and animate
    this.target.x = newX;
    this.target.y = newY;
    this.target.scale = newScale;
    this.isAnimating = true;
    this.activeContainer = element;

    this.startAnimationLoop();
  }

  /**
   * Level of Detail (LoD) Check
   * Injects/removes micro-elements (individual seats) based on scale threshold
   */
  checkLoD() {
    if (this.state.scale >= this.LoD_THRESHOLD && !this.seatsRendered) {
      // Threshold exceeded - inject seats
      this.injectSeats();
    } else if (this.state.scale < this.LoD_THRESHOLD && this.seatsRendered) {
      // Below threshold - clear seats
      this.clearSeats();
    }
  }

  /**
   * Inject individual seat elements into active container
   * This is triggered dynamically when zooming sufficiently (scale >= 2.5)
   */
  injectSeats() {
    console.log('💉 Injecting seats (LoD triggered at scale >= 2.5)');
    this.seatsRendered = true;

    if (!this.activeContainer) {
      console.warn('⚠️ No active container for seat injection');
      return;
    }

    // Generate 20-30 sample seats in the active section
    // In production, fetch from API: GET /api/sections/{sectionId}/seats
    for (let i = 0; i < 25; i++) {
      // Distribute seats randomly within section bounds
      const x = Math.random() * 800 + 100;
      const y = Math.random() * 600 + 100;
      const seatId = `seat-${Date.now()}-${i}`;

      // Create SVG circle for seat
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '15');
      circle.setAttribute('fill', '#4CAF50');
      circle.setAttribute('data-seat-id', seatId);
      circle.style.cursor = 'pointer';
      circle.style.transition = 'all 0.2s';

      // Click handler
      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectSeat(seatId, circle);
      });

      // Hover effects
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('fill', '#45a049');
        circle.setAttribute('r', '20');
      });

      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('fill', '#4CAF50');
        circle.setAttribute('r', '15');
      });

      // Append to active section
      this.activeContainer.appendChild(circle);
      this.seatElements.set(seatId, circle);
      this.renderedSeats.add(seatId);
    }

    console.log(`✅ Rendered ${this.renderedSeats.size} seats`);
  }

  /**
   * Clear injected seats from DOM (cleanup on zoom out below threshold)
   */
  clearSeats() {
    console.log('🗑️ Clearing seats (LoD cleanup below 2.5x)');
    
    this.seatElements.forEach((seatElement) => {
      if (seatElement.parentNode) {
        seatElement.parentNode.removeChild(seatElement);
      }
    });

    this.seatElements.clear();
    this.renderedSeats.clear();
    this.seatsRendered = false;

    console.log('✅ Cleared all seat elements');
  }

  /**
   * Handle individual seat selection
   */
  selectSeat(seatId, seatElement) {
    console.log(`🪑 Selected seat: ${seatId}`);
    seatElement.setAttribute('fill', '#2196F3');
    seatElement.setAttribute('r', '25');
    // Dispatch custom event for parent system to handle
    document.dispatchEvent(new CustomEvent('zoom:seat-selected', { detail: { seatId } }));
  }

  /**
   * Reset zoom to original view (scale 1x, translate 0,0)
   */
  resetZoom() {
    this.target.x = 0;
    this.target.y = 0;
    this.target.scale = 1;
    this.isAnimating = true;
    this.activeContainer = null;
    this.clearSeats();
    this.startAnimationLoop();
    console.log('↩️ Reset zoom to 1x');
  }

  /**
   * Pan by delta (used for drag-to-pan interactions, optional)
   */
  pan(deltaX, deltaY) {
    this.target.x += deltaX;
    this.target.y += deltaY;
    this.isAnimating = true;
    this.startAnimationLoop();
  }

  /**
   * Get current zoom level (0-1 scale)
   */
  getCurrentZoom() {
    return this.state.scale;
  }

  /**
   * Get current viewport translation
   */
  getCurrentTransform() {
    return { x: this.state.x, y: this.state.y, scale: this.state.scale };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.zoomSeatManager = new ZoomSeatManager();
  });
} else {
  window.zoomSeatManager = new ZoomSeatManager();
}
