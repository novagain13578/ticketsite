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
    
    // SVG Coordinate System
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
   * Setup zoom header with back button and zoom level indicator
   */
  setupZoomHeader() {
    const mapHeader = document.createElement('div');
    mapHeader.id = 'zoomHeader';
    mapHeader.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: rgba(26, 31, 46, 0.95);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.3s;
    `;

    mapHeader.innerHTML = `
      <button id="zoomBackBtn" style="
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
      ">← Back</button>
      <span id="zoomLevel" style="color: #fff; font-size: 12px; font-weight: 600;">100%</span>
      <button id="zoomResetBtn" style="
        background: #1a4fc4;
        color: #fff;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
      ">Reset Zoom</button>
    `;

    document.body.appendChild(mapHeader);

    // Event handlers
    document.getElementById('zoomBackBtn').addEventListener('click', () => this.zoomOut());
    document.getElementById('zoomResetBtn').addEventListener('click', () => this.resetZoom());
  }

  /**
   * Setup mini-map overlay
   */
  setupMiniMap() {
    const miniMap = document.createElement('div');
    miniMap.id = 'miniMap';
    miniMap.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 16px;
      width: 120px;
      height: 90px;
      background: rgba(26, 31, 46, 0.8);
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 8px;
      z-index: 99;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    `;

    miniMap.innerHTML = `
      <svg style="width:100%;height:100%;" viewBox="0 0 10240 7680">
        <!-- Clone stadium sections here -->
      </svg>
      <div id="miniMapViewport" style="
        position: absolute;
        border: 2px solid #ffe000;
        background: rgba(255,224,0,0.1);
        pointer-events: none;
      "></div>
    `;

    const mapContainer = document.getElementById('desktopMapMount') || document.getElementById('mapContainer');
    if (mapContainer) {
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(miniMap);
    }
  }

  /**
   * Setup gesture handlers for touch/mouse wheel zoom
   */
  setupGestureHandlers() {
    const mapContainer = document.getElementById('desktopMapMount') || document.getElementById('mapContainer');
    if (!mapContainer) return;

    // Wheel zoom
    mapContainer.addEventListener('wheel', (e) => {
      if (!this.isZoomed) return;
      e.preventDefault();

      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom * zoomDelta));
      this.applyZoom(mapContainer, newZoom);
    });

    // Touch pinch-to-zoom
    let lastDistance = 0;
    mapContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.hypot(dx, dy);

      if (lastDistance > 0) {
        const zoomDelta = currentDistance / lastDistance;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom * zoomDelta));
        this.applyZoom(mapContainer, newZoom);
      }
      lastDistance = currentDistance;
    }, { passive: false });

    mapContainer.addEventListener('touchend', () => {
      lastDistance = 0;
    });
  }

  /**
   * Attach section click handlers for deep zoom
   */
  attachSectionClickHandlers() {
    // Find sections in either the original SVG or cloned SVG
    const svg = document.querySelector('svg.stadium-svg') || 
                document.querySelector('#desktopMapMount svg');
    
    if (!svg) {
      console.warn('⚠️ SVG element not found for section handlers');
      return;
    }

    // Find all available sections
    const sections = svg.querySelectorAll('.block.is-available[data-section-id]');
    
    console.log(`📍 Found ${sections.length} clickable sections`);

    sections.forEach((section) => {
      section.style.cursor = 'pointer';
      
      section.addEventListener('click', (e) => {
        e.stopPropagation();
        const sectionId = section.getAttribute('data-section-id');
        const sectionName = section.getAttribute('data-section-name');
        
        console.log(`🔍 Zooming to section: ${sectionName}`);
        this.zoomToSection(sectionId, sectionName, section);
      });

      // Hover effect
      section.addEventListener('mouseenter', () => {
        if (section.classList.contains('is-available')) {
          section.style.opacity = '0.8';
        }
      });

      section.addEventListener('mouseleave', () => {
        section.style.opacity = '1';
      });
    });
  }

  /**
   * Zoom to a specific section using animated viewport change
   */
  zoomToSection(sectionId, sectionName, sectionElement) {
    if (this.isAnimating) return;

    // Get bounding box of section
    let bbox;
    try {
      bbox = sectionElement.getBBox();
    } catch (e) {
      console.error('❌ Could not get bBox for section:', sectionId, e);
      return;
    }

    if (!bbox || bbox.width === 0 || bbox.height === 0) {
      console.warn('⚠️ Invalid bbox for section:', sectionId);
      return;
    }

    const padding = 200; // Extra space around section

    // Get map container to calculate zoom
    const mapContainer = document.getElementById('desktopMapMount') || 
                        document.getElementById('mapContainer');
    if (!mapContainer) {
      console.warn('⚠️ Map container not found');
      return;
    }

    const containerRect = mapContainer.getBoundingClientRect();

    const zoomX = Math.max(1, containerRect.width / (bbox.width + padding * 2));
    const zoomY = Math.max(1, containerRect.height / (bbox.height + padding * 2));
    const zoom = Math.min(zoomX, zoomY, this.maxZoom);

    // Target viewBox
    const newViewBox = {
      x: Math.max(0, bbox.x - padding),
      y: Math.max(0, bbox.y - padding),
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2
    };

    console.log(`🎯 Zoom to ${sectionName}: x=${newViewBox.x}, y=${newViewBox.y}, zoom=${zoom.toFixed(2)}x`);

    // Animate zoom
    this.animateZoom(newViewBox, zoom, sectionId, sectionName);
  }

  /**
   * Animated zoom to target viewBox
   */
  animateZoom(targetViewBox, targetZoom, sectionId, sectionName) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const svg = document.querySelector('svg.stadium-svg') || 
                document.querySelector('#desktopMapMount svg');
    
    if (!svg) {
      console.error('❌ SVG not found for zoom animation');
      this.isAnimating = false;
      return;
    }

    // Get current viewBox
    const currentViewBoxAttr = svg.getAttribute('viewBox') || '0 0 10240 7680';
    const [x, y, w, h] = currentViewBoxAttr.split(' ').map(Number);
    
    const startViewBox = { x, y, width: w, height: h };

    const animationStart = Date.now();
    const duration = this.animationDuration;

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = () => {
      const elapsed = Date.now() - animationStart;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      const currentViewBox = {
        x: startViewBox.x + (targetViewBox.x - startViewBox.x) * eased,
        y: startViewBox.y + (targetViewBox.y - startViewBox.y) * eased,
        width: startViewBox.width + (targetViewBox.width - startViewBox.width) * eased,
        height: startViewBox.height + (targetViewBox.height - startViewBox.height) * eased
      };

      svg.setAttribute('viewBox', 
        `${currentViewBox.x} ${currentViewBox.y} ${currentViewBox.width} ${currentViewBox.height}`
      );

      this.currentZoom = targetZoom * eased;
      this.updateZoomLevel();
      this.updateMiniMap(currentViewBox);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.isZoomed = true;
        this.zoomedSection = { id: sectionId, name: sectionName };
        this.currentZoom = targetZoom;

        // Show zoom header and mini-map
        this.showZoomControls();

        // Render seats if zoom threshold exceeded
        if (this.currentZoom >= this.zoomThreshold) {
          this.renderSeatsForSection(sectionId);
        }

        console.log(`✅ Zoom complete. Level: ${this.currentZoom.toFixed(2)}x`);
      }
    };

    animate();
  }

  /**
   * Render individual seat circles for a section
   */
  renderSeatsForSection(sectionId) {
    const sectionData = this.seatAvailability[sectionId];
    if (!sectionData || !sectionData.seats) {
      console.warn(`⚠️ No seat data for section ${sectionId}`);
      return;
    }

    const svg = document.querySelector('svg.stadium-svg') || 
                document.querySelector('#desktopMapMount svg');
    if (!svg) {
      console.warn('⚠️ SVG not found for seat rendering');
      return;
    }

    // Create a group for seats
    let seatGroup = svg.querySelector(`#seats-${sectionId}`);
    if (!seatGroup) {
      seatGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      seatGroup.id = `seats-${sectionId}`;
      svg.appendChild(seatGroup);
    }

    // Get section element to determine position
    const sectionElement = svg.querySelector(`[data-section-id="${sectionId}"]`);
    let bbox;
    try {
      bbox = sectionElement ? sectionElement.getBBox() : null;
    } catch (e) {
      console.warn(`⚠️ Could not get bbox for section ${sectionId}:`, e);
      return;
    }

    if (!bbox || bbox.width === 0 || bbox.height === 0) {
      console.warn(`⚠️ Invalid bbox for section ${sectionId}`);
      return;
    }

    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    let seatsRendered = 0;

    // Render seats as circles, distributed within section bounds
    sectionData.seats.forEach((seat, index) => {
      const seatId = `${sectionId}-${seat.number}`;

      if (this.renderedSeats.has(seatId)) return;

      // Calculate position within bounds with some randomness for visual interest
      const angle = (index / sectionData.seats.length) * Math.PI * 2;
      const radius = (bbox.width + bbox.height) / 4;

      const x = centerX + Math.cos(angle) * radius * 0.7 + (Math.random() - 0.5) * 40;
      const y = centerY + Math.sin(angle) * radius * 0.7 + (Math.random() - 0.5) * 40;

      // Create seat circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '20');
      circle.setAttribute('data-seat-id', seatId);
      circle.setAttribute('data-seat-info', JSON.stringify(seat));
      circle.style.fill = seat.status === 'available' ? '#1a4fc4' : '#ccc';
      circle.style.cursor = seat.status === 'available' ? 'pointer' : 'default';
      circle.style.transition = 'all 0.2s';

      // Interactive on hover
      circle.addEventListener('mouseenter', () => {
        if (seat.status === 'available') {
          circle.setAttribute('r', '26');
          circle.style.fill = '#4a90e2';
          this.showSeatTooltip(seat, x, y);
        }
      });

      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', '20');
        circle.style.fill = seat.status === 'available' ? '#1a4fc4' : '#ccc';
        this.hideSeatTooltip();
      });

      circle.addEventListener('click', () => {
        if (seat.status === 'available') {
          this.selectSeatFromZoom(seatId, seat);
        }
      });

      seatGroup.appendChild(circle);
      this.renderedSeats.add(seatId);
      this.seatElements.set(seatId, circle);
      seatsRendered++;
    });

    console.log(`👥 Rendered ${seatsRendered} seats for section ${sectionId}`);
  }
      });

      circle.addEventListener('click', () => {
        if (seat.status === 'available') {
          this.selectSeatFromZoom(seatId, seat);
        }
      });

      seatGroup.appendChild(circle);
      this.renderedSeats.add(seatId);
      this.seatElements.set(seatId, circle);
    });
  }

  /**
   * Show seat tooltip on hover
   */
  showSeatTooltip(seat, x, y) {
    let tooltip = document.getElementById('seatDetailTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'seatDetailTooltip';
      document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = `
      <div style="
        background: #1a1f2e;
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        border: 1px solid rgba(255,255,255,0.2);
      ">
        Row ${seat.row}, Seat ${seat.number}<br/>
        <strong>$${seat.price}</strong>
      </div>
    `;

    tooltip.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y - 60}px;
      z-index: 1000;
      pointer-events: none;
    `;
  }

  /**
   * Hide seat tooltip
   */
  hideSeatTooltip() {
    const tooltip = document.getElementById('seatDetailTooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  /**
   * Select a seat from zoom view
   */
  selectSeatFromZoom(seatId, seat) {
    this.selectedSeats.set(seatId, seat);
    this.updatePricingSummary();

    const circle = this.seatElements.get(seatId);
    if (circle) {
      circle.style.fill = '#ffe000';
      circle.style.filter = 'drop-shadow(0 0 6px rgba(255,224,0,0.7))';
    }
  }

  /**
   * Update zoom level display
   */
  updateZoomLevel() {
    const levelEl = document.getElementById('zoomLevel');
    if (levelEl) {
      levelEl.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }
  }

  /**
   * Update mini-map viewport indicator
   */
  updateMiniMap(viewBox) {
    const viewport = document.getElementById('miniMapViewport');
    if (!viewport || !viewBox) return;

    const scale = 120 / this.viewportWidth;
    const x = viewBox.x * scale;
    const y = viewBox.y * scale;
    const width = viewBox.width * scale;
    const height = viewBox.height * scale;

    viewport.style.cssText = `
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      border: 2px solid #ffe000;
      background: rgba(255,224,0,0.1);
    `;
  }

  /**
   * Show zoom controls
   */
  showZoomControls() {
    const header = document.getElementById('zoomHeader');
    const miniMap = document.getElementById('miniMap');

    if (header) header.style.opacity = '1';
    if (miniMap) miniMap.style.opacity = '1';
  }

  /**
   * Hide zoom controls
   */
  hideZoomControls() {
    const header = document.getElementById('zoomHeader');
    const miniMap = document.getElementById('miniMap');

    if (header) header.style.opacity = '0';
    if (miniMap) miniMap.style.opacity = '0';
  }

  /**
   * Reset zoom to overview
   */
  resetZoom() {
    if (this.isAnimating) return;

    const svg = document.querySelector('svg.stadium-svg') || 
                document.querySelector('#desktopMapMount svg');
    if (!svg) return;

    const resetViewBox = {
      x: 0,
      y: 0,
      width: this.viewportWidth,
      height: this.viewportHeight
    };

    this.animateZoom(resetViewBox, 1, null, null);

    this.isZoomed = false;
    this.zoomedSection = null;
    this.hideZoomControls();

    // Clear rendered seats
    this.renderedSeats.forEach((seatId) => {
      const element = this.seatElements.get(seatId);
      if (element) element.remove();
    });
    this.renderedSeats.clear();
    this.seatElements.clear();
  }

  /**
   * Alias for resetZoom
   */
  zoomOut() {
    this.resetZoom();
  }
}

// Initialize zoom system
console.log(`📊 Viewport width: ${window.innerWidth}px (Desktop breakpoint: 768px)`);

const attemptZoomInit = () => {
  // Check viewport first
  if (window.innerWidth < 768) {
    console.log('📱 Mobile mode detected (< 768px) - deferring zoom initialization...');
    return;
  }

  const mapContainer = document.getElementById('desktopMapMount');
  
  if (!mapContainer) {
    console.log('❌ Desktop map mount container not found');
    return;
  }

  // Check if map is visible
  if (mapContainer.offsetParent === null) {
    console.log('⏸️ Map container is hidden - deferring zoom initialization...');
    return;
  }

  console.log('🚀 Initializing ZoomSeatManager for desktop view...');
  try {
    if (!window.zoomSeatManager) {
      window.zoomSeatManager = new ZoomSeatManager();
    }
    
    // Log visibility status
    const rect = mapContainer.getBoundingClientRect();
    console.log(`   ✅ Zoom system ready`);
    console.log(`   📏 Map dimensions: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px`);
    
  } catch (e) {
    console.error('❌ Failed to initialize ZoomSeatManager:', e);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(attemptZoomInit, 100); // Small delay for layout calculation
  });
} else {
  setTimeout(attemptZoomInit, 100);
}

// Also handle window resize to initialize zoom if page switches to desktop
window.addEventListener('resize', () => {
  if (window.zoomSeatManager && window.zoomSeatManager.initialized) {
    return; // Already initialized and working
  }
  
  // Try to initialize if not already done
  console.log('📐 Viewport changed, checking for zoom initialization opportunity...');
  attemptZoomInit();
});
