/**
 * SVG SEAT DATA ATTRIBUTE INJECTOR
 * Adds data-price, data-row, and data-seat attributes to SVG sections
 * Enables dynamic cart management and checkout integration
 */

class SVGSeatAttributeInjector {
  constructor() {
    this.sectionPrices = this.initializePrices();
    this.init();
  }

  // ============================================
  // PRICE MAPPING BY SECTION
  // ============================================
  initializePrices() {
    return {
      // Premium/Club Sections
      'CLUB 109': { price: 350, category: 'Club' },
      'CLUB 110': { price: 350, category: 'Club' },
      'CLUB 137': { price: 350, category: 'Club' },
      
      // Pit/GA Sections
      'PIT A': { price: 680, category: 'Pit' },
      'PIT B': { price: 680, category: 'Pit' },
      'PIT C': { price: 680, category: 'Pit' },
      'PIT D': { price: 680, category: 'Pit' },
      
      // Lower Level Sections (100s)
      '101': { price: 380, category: 'Lower' },
      '102': { price: 380, category: 'Lower' },
      '103': { price: 380, category: 'Lower' },
      '104': { price: 380, category: 'Lower' },
      '105': { price: 380, category: 'Lower' },
      '106': { price: 380, category: 'Lower' },
      '107': { price: 380, category: 'Lower' },
      '108': { price: 380, category: 'Lower' },
      
      // Floor/Main Level (118, 119, 120, etc.)
      '118': { price: 380, category: 'Floor' },
      '119': { price: 380, category: 'Floor' },
      '120': { price: 380, category: 'Floor' },
      '121': { price: 380, category: 'Floor' },
      '122': { price: 380, category: 'Floor' },
      '123': { price: 380, category: 'Floor' },
      '124': { price: 380, category: 'Floor' },
      '125': { price: 380, category: 'Floor' },
      '126': { price: 380, category: 'Floor' },
      '127': { price: 380, category: 'Floor' },
      '128': { price: 350, category: 'Premium' },
      '129': { price: 350, category: 'Premium' },
      '130': { price: 350, category: 'Premium' },
      
      // Upper Level (200s)
      '205': { price: 210, category: 'Upper' },
      '206': { price: 210, category: 'Upper' },
      '207': { price: 210, category: 'Upper' },
      '208': { price: 210, category: 'Upper' },
      '218': { price: 210, category: 'Upper' },
      '219': { price: 210, category: 'Upper' },
      '220': { price: 210, category: 'Upper' },
      '221': { price: 210, category: 'Upper' },
      '222': { price: 210, category: 'Upper' },
      '223': { price: 210, category: 'Upper' },
      '224': { price: 210, category: 'Upper' },
      '225': { price: 210, category: 'Upper' },
      '226': { price: 210, category: 'Upper' },
      '227': { price: 210, category: 'Upper' },
      '228': { price: 210, category: 'Upper' },
      
      // Sidelines (300s)
      '303': { price: 130, category: 'Side' },
      '304': { price: 130, category: 'Side' },
      '305': { price: 130, category: 'Side' },
      '306': { price: 130, category: 'Side' },
      '307': { price: 130, category: 'Side' },
      '308': { price: 130, category: 'Side' },
      '317': { price: 130, category: 'Side' },
      '318': { price: 130, category: 'Side' },
      '319': { price: 130, category: 'Side' },
      '320': { price: 130, category: 'Side' },
      '321': { price: 130, category: 'Side' },
      '322': { price: 130, category: 'Side' },
      '323': { price: 130, category: 'Side' },
      '324': { price: 130, category: 'Side' },
      '325': { price: 130, category: 'Side' },
      '326': { price: 130, category: 'Side' },
      '327': { price: 130, category: 'Side' },
      '328': { price: 130, category: 'Side' },
      '329': { price: 130, category: 'Side' },
      '330': { price: 130, category: 'Side' },
      '331': { price: 130, category: 'Side' },
      
      // Corners/Back (400s)
      '407': { price: 81, category: 'Corner' },
      '408': { price: 81, category: 'Corner' },
      '409': { price: 81, category: 'Corner' },
      '410': { price: 81, category: 'Corner' },
      '411': { price: 81, category: 'Corner' },
      '412': { price: 81, category: 'Corner' },
      '413': { price: 81, category: 'Corner' },
      '414': { price: 81, category: 'Corner' },
      '415': { price: 81, category: 'Corner' },
      '416': { price: 81, category: 'Corner' },
      '417': { price: 81, category: 'Corner' },
      '418': { price: 81, category: 'Corner' },
      '419': { price: 81, category: 'Corner' },
      '420': { price: 81, category: 'Corner' },
      '421': { price: 81, category: 'Corner' },
      
      // Seat Blocks (A, B, C)
      'A1': { price: 1200, category: 'Premium' },
      'A2': { price: 1200, category: 'Premium' },
      'A3': { price: 1200, category: 'Premium' },
      'A4': { price: 1200, category: 'Premium' },
      'A5': { price: 1200, category: 'Premium' },
      'B1': { price: 1200, category: 'Premium' },
      'B2': { price: 1200, category: 'Premium' },
      'B3': { price: 1200, category: 'Premium' },
      'B4': { price: 1200, category: 'Premium' },
      'B5': { price: 1200, category: 'Premium' },
      'C3': { price: 1200, category: 'Premium' },
      'C3 ADA': { price: 1200, category: 'Premium' },
      'C 109': { price: 350, category: 'Club' },
      'C 110': { price: 350, category: 'Club' },
      'C 131': { price: 350, category: 'Club' },
      'C 132': { price: 350, category: 'Club' },
      
      // Floor seats (lower case numbers in 400s)
      '435': { price: 81, category: 'Corner' },
      '436': { price: 81, category: 'Corner' },
      '437': { price: 81, category: 'Corner' },
      '438': { price: 81, category: 'Corner' },
      '439': { price: 81, category: 'Corner' },
      '440': { price: 81, category: 'Corner' },
      '441': { price: 81, category: 'Corner' },
      '442': { price: 81, category: 'Corner' },
      '443': { price: 81, category: 'Corner' },
      '444': { price: 81, category: 'Corner' },
      
      // End zones
      '244': { price: 125, category: 'Endzone' },
      '245': { price: 125, category: 'Endzone' },
      '246': { price: 125, category: 'Endzone' },
      '247': { price: 125, category: 'Endzone' },
      '248': { price: 125, category: 'Endzone' },
      '336': { price: 130, category: 'Endzone' },
      '337': { price: 130, category: 'Endzone' },
      '338': { price: 130, category: 'Endzone' },
      '339': { price: 130, category: 'Endzone' },
      '340': { price: 130, category: 'Endzone' },
      '341': { price: 130, category: 'Endzone' },
      '342': { price: 130, category: 'Endzone' },
      '343': { price: 130, category: 'Endzone' },
      '344': { price: 130, category: 'Endzone' },
      '345': { price: 130, category: 'Endzone' },
      '346': { price: 130, category: 'Endzone' },
      '347': { price: 130, category: 'Endzone' },
    };
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  init() {
    this.injectDataAttributes();
    console.log('✅ SVG Seat Attributes Injected');
  }

  // ============================================
  // INJECT DATA ATTRIBUTES INTO SVG SECTIONS
  // ============================================
  injectDataAttributes() {
    const sections = document.querySelectorAll('[data-section-name]');
    
    sections.forEach(section => {
      const sectionName = section.getAttribute('data-section-name') || '';
      const sectionId = section.getAttribute('data-section-id') || '';
      
      // Get price info
      const priceInfo = this.sectionPrices[sectionName] || { price: 150, category: 'Standard' };
      
      // Generate seat ID from section ID
      const seatId = `seat-${sectionId}-01`;
      
      // Add data attributes
      section.setAttribute('data-price', `$${priceInfo.price}`);
      section.setAttribute('data-section', sectionName);
      section.setAttribute('data-row', 'A'); // Base row
      section.setAttribute('data-seat', seatId);
      
      // Add click cursor
      if (!section.classList.contains('sold') && !section.classList.contains('unavailable')) {
        section.style.cursor = 'pointer';
      }
    });

    // Log summary
    console.log(`✅ Injected seat attributes to ${sections.length} sections`);
  }

  // ============================================
  // PUBLIC API
  // ============================================
  getPrice(sectionName) {
    const priceInfo = this.sectionPrices[sectionName];
    return priceInfo ? priceInfo.price : 150;
  }

  getCategory(sectionName) {
    const priceInfo = this.sectionPrices[sectionName];
    return priceInfo ? priceInfo.category : 'Standard';
  }

  getAllSections() {
    return document.querySelectorAll('[data-section-name]');
  }
}

// ============================================
// GLOBAL INITIALIZATION
// ============================================
let svgSeatInjector;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    svgSeatInjector = new SVGSeatAttributeInjector();
    window.svgSeatInjector = svgSeatInjector;
  });
} else {
  svgSeatInjector = new SVGSeatAttributeInjector();
  window.svgSeatInjector = svgSeatInjector;
}
