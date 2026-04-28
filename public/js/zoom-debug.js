/**
 * Zoom System Diagnostic & Debug Tool
 * Run this in browser console to check zoom status
 */

window.debugZoom = {
  /**
   * Check if zoom system is initialized
   */
  status: function() {
    console.group('🎯 Zoom System Status');
    
    console.log('Viewport width:', window.innerWidth + 'px');
    console.log('Desktop breakpoint:', '768px (min-width)');
    console.log('Current mode:', window.innerWidth >= 768 ? '✅ Desktop' : '📱 Mobile');
    
    const zoomManager = window.zoomSeatManager;
    console.log('');
    console.log('Manager created:', !!zoomManager);
    
    if (zoomManager) {
      console.log('Manager initialized:', zoomManager.initialized);
      console.log('Current zoom:', zoomManager.currentZoom.toFixed(2) + 'x');
      console.log('Is zoomed:', zoomManager.isZoomed);
      console.log('Is animating:', zoomManager.isAnimating);
      console.log('Zoom threshold:', zoomManager.zoomThreshold + 'x');
      console.log('Max zoom:', zoomManager.maxZoom + 'x');
      console.log('Rendered seats:', zoomManager.renderedSeats.size);
      console.log('Seat data sections:', Object.keys(zoomManager.seatAvailability).length);
    } else {
      console.warn('⚠️ ZoomSeatManager not created');
    }
    
    // Check SVG
    const svg = document.querySelector('svg.stadium-svg') || 
                document.querySelector('#desktopMapMount svg');
    console.log('');
    console.log('SVG found:', !!svg);
    if (svg) {
      console.log('SVG viewBox:', svg.getAttribute('viewBox'));
      const sections = svg.querySelectorAll('.block.is-available');
      console.log('Clickable sections:', sections.length);
    }
    
    // Check containers
    const mapContainer = document.getElementById('desktopMapMount');
    console.log('');
    console.log('Desktop map mount found:', !!mapContainer);
    if (mapContainer) {
      const isVisible = mapContainer.offsetParent !== null;
      const rect = mapContainer.getBoundingClientRect();
      console.log('  Status:', isVisible ? '✅ Visible' : '❌ Hidden (CSS display: none or parent hidden)');
      console.log('  Reason:', window.innerWidth < 768 ? 'Viewport < 768px (mobile mode)' : 'CSS display: none');
      console.log('  Dimensions:', `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px`);
      console.log('  Computed display:', window.getComputedStyle(mapContainer).display);
    }
    
    console.groupEnd();
  },

  /**
   * Test zoom to first available section
   */
  testZoom: function() {
    console.log('🧪 Testing zoom...');
    
    const zoomManager = window.zoomSeatManager;
    if (!zoomManager) {
      console.error('❌ Zoom manager not initialized');
      return;
    }

    const svg = document.querySelector('svg.stadium-svg') || 
                document.querySelector('#desktopMapMount svg');
    if (!svg) {
      console.error('❌ SVG not found');
      return;
    }

    const sections = svg.querySelectorAll('.block.is-available');
    if (sections.length === 0) {
      console.error('❌ No clickable sections found');
      return;
    }

    const firstSection = sections[0];
    const sectionId = firstSection.getAttribute('data-section-id');
    const sectionName = firstSection.getAttribute('data-section-name');

    console.log(`🎯 Zooming to section: ${sectionName} (${sectionId})`);
    zoomManager.zoomToSection(sectionId, sectionName, firstSection);
  },

  /**
   * Reset zoom
   */
  reset: function() {
    const zoomManager = window.zoomSeatManager;
    if (!zoomManager) {
      console.error('❌ Zoom manager not initialized');
      return;
    }
    console.log('🔄 Resetting zoom...');
    zoomManager.resetZoom();
  },

  /**
   * List all available sections
   */
  listSections: function() {
    const zoomManager = window.zoomSeatManager;
    if (!zoomManager) {
      console.error('❌ Zoom manager not initialized');
      return;
    }

    console.group('🗺️ Available Sections');
    Object.entries(zoomManager.seatAvailability).forEach(([id, data]) => {
      console.log(`${data.name} (${id}): ${data.seats ? data.seats.length : 0} seats, $${data.price}`);
    });
    console.groupEnd();
  },

  /**
   * Manually trigger seat rendering
   */
  renderSeats: function(sectionId) {
    const zoomManager = window.zoomSeatManager;
    if (!zoomManager) {
      console.error('❌ Zoom manager not initialized');
      return;
    }

    if (!sectionId) {
      console.error('❌ Please provide section ID');
      return;
    }

    console.log(`👥 Rendering seats for section ${sectionId}...`);
    zoomManager.renderSeatsForSection(sectionId);
  },

  /**
   * Check DOM structure
   */
  checkDOM: function() {
    console.group('🔍 DOM Structure Check');
    
    const desktopLayout = document.querySelector('.desktop-layout-wrapper');
    console.log('Desktop layout exists:', !!desktopLayout);
    
    const mapMount = document.getElementById('desktopMapMount');
    console.log('Map mount exists:', !!mapMount);
    if (mapMount) {
      console.log('Map mount children:', mapMount.children.length);
      console.log('Map mount innerHTML length:', mapMount.innerHTML.length);
    }
    
    const mapContainer = document.getElementById('mapContainer');
    console.log('Map container exists:', !!mapContainer);
    if (mapContainer) {
      console.log('Map container visibility:', window.getComputedStyle(mapContainer).display);
    }
    
    console.groupEnd();
  },

  /**
   * Force zoom to specific section
   */
  zoomToSection: function(sectionId) {
    const zoomManager = window.zoomSeatManager;
    if (!zoomManager) {
      console.error('❌ Zoom manager not initialized');
      return;
    }

    const sectionData = zoomManager.seatAvailability[sectionId];
    if (!sectionData) {
      console.error(`❌ Section ${sectionId} not found`);
      return;
    }

    const svg = document.querySelector('svg.stadium-svg') || 
                document.querySelector('#desktopMapMount svg');
    if (!svg) {
      console.error('❌ SVG not found');
      return;
    }

    const sectionElement = svg.querySelector(`[data-section-id="${sectionId}"]`);
    if (!sectionElement) {
      console.error(`❌ Section element not found in SVG`);
      return;
    }

    console.log(`🎯 Zooming to section ${sectionData.name}...`);
    zoomManager.zoomToSection(sectionId, sectionData.name, sectionElement);
  },

  /**
   * Manually initialize zoom system
   */
  init: function() {
    console.log('🔧 Zoom System Manual Init');
    console.log('   Viewport: ' + window.innerWidth + 'px');
    console.log('   Desktop breakpoint: 768px (min-width)');
    
    // Check viewport
    if (window.innerWidth < 768) {
      console.warn('❌ Viewport is in MOBILE MODE (< 768px)');
      console.log('   → Resize browser to ≥ 768px to enable zoom system');
      console.log('   → Or use Dev Tools: Ctrl+Shift+M (Windows) or Cmd+Shift+M (Mac)');
      return;
    }
    
    // Already initialized
    if (window.zoomSeatManager?.initialized) {
      console.log('✅ Zoom system is already initialized');
      console.log('   → Try: window.debugZoom.testZoom()');
      return;
    }
    
    // Manager exists but not initialized
    if (window.zoomSeatManager) {
      console.log('⏳ Manager exists but not fully initialized');
      console.log('   Waiting for SVG to load and setup...');
      window.zoomSeatManager.initializeZoomUI();
      setTimeout(() => {
        const status = window.zoomSeatManager.initialized ? '✅ Initialized' : '⏳ Still initializing...';
        console.log('   Status: ' + status);
      }, 1000);
      return;
    }
    
    // Create new manager
    console.log('📊 Creating new ZoomSeatManager...');
    try {
      window.zoomSeatManager = new ZoomSeatManager();
      setTimeout(() => {
        const status = window.zoomSeatManager.initialized ? '✅ Initialized' : '⏳ Initializing...';
        console.log('   Status: ' + status);
      }, 800);
    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  },

  /**
   * Help
   */
  help: function() {
    console.log(`
🎯 Zoom System Debug Commands:

window.debugZoom.status()           - Show zoom system status
window.debugZoom.init()             - Manually initialize zoom system
window.debugZoom.testZoom()         - Test zoom to first section
window.debugZoom.reset()            - Reset zoom
window.debugZoom.listSections()     - List all sections
window.debugZoom.checkDOM()         - Check DOM structure
window.debugZoom.zoomToSection(id)  - Zoom to specific section
window.debugZoom.renderSeats(id)    - Force seat rendering
window.debugZoom.help()             - Show this help

Examples:
  window.debugZoom.status()
  window.debugZoom.init()
  window.debugZoom.testZoom()
  window.debugZoom.zoomToSection('s_101')
    `);
  }
};

// Auto-run status on load
window.addEventListener('load', () => {
  setTimeout(() => {
    console.log('✅ Zoom debug tools loaded. Type: window.debugZoom.help()');
  }, 1000);
});
