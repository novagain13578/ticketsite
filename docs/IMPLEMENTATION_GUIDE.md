# Concert Venue Seat Selection System

A responsive, interactive seat selection system for concert ticket purchasing that works on both mobile and desktop layouts.

## Overview

This system provides an intuitive interface for customers to:
- **View** an interactive venue map with color-coded seating sections
- **Select** individual seats with real-time price updates
- **Manage** their shopping cart with a maximum ticket limit
- **Purchase** tickets with a checkout flow

## Architecture

### Core Components

#### 1. **SeatSelectionManager** (`seat-selection.js`)
The main class that handles all seat selection logic on mobile and responsive layouts.

**Key Responsibilities:**
- Initialize seat and section data
- Handle user interactions (clicks on sections)
- Manage selected seats in a Map data structure
- Generate pricing based on seating level
- Update the UI with selections and summaries

**Main Methods:**
```javascript
- constructor()              // Initialize the manager
- setupEventListeners()      // Attach click/hover events to SVG sections
- handleSectionClick(el)     // Process section selection
- handleSeatSelection(e, el) // Process individual seat selection
- displayTicketList(id)      // Show available seats in bottom sheet
- getSelectedSeatsSummary()  // Get current selection state
- resetSelection()           // Clear all selections
```

#### 2. **DesktopSeatManager** (`desktop-seat-selection.js`)
Extends `SeatSelectionManager` for desktop layout with:
- 3-column layout support (sidebar + map + tickets panel)
- Zoom controls for the map
- Date selection sidebar
- Enhanced desktop UX

### Data Structure

```javascript
// Seat object
{
  id: "s_101-seat-1",      // Unique identifier
  row: "A",                 // Row letter
  number: 1,                // Seat number
  status: "available",      // 'available', 'sold', 'unavailable'
  price: 632                // Price in dollars
}

// Section object
{
  name: "101",              // Section number
  level: "100",             // Seating tier
  totalSeats: 10,           // Total capacity
  availableSeats: 7,        // Remaining availability
  price: 632,               // Base price
  seats: [...Seat[]]        // Array of seat objects
}
```

## Features

### 1. Interactive Venue Map
- **Color-coded sections** by seating level:
  - 🟦 **400 Level**: Light blue ($150)
  - 🟦 **300 Level**: Medium blue ($280)
  - 🟦 **200 Level**: Dark blue ($450)
  - 🟦 **100 Level**: Navy blue ($632)
  - 🟪 **CLUB**: Purple ($550)
  - 🟩 **PIT/FLOOR**: Green ($95)

- **Hover tooltips** showing:
  - Section name
  - Price
  - Availability

- **Visual feedback** on selection with gold borders and glow effect

### 2. Bottom Sheet (Mobile)
Displays when a section is clicked:
- Section name and details
- Available seats with prices
- Real-time seat selection
- Purchase summary (when seats selected)
- "Continue to Checkout" button

### 3. Desktop 3-Column Layout
- **Left sidebar**: Date selection
- **Center**: Interactive venue map with zoom controls
- **Right panel**: Ticket listings for selected section
- Responsive design switches at 768px breakpoint

### 4. Pricing System
```javascript
// Base prices by level
100 Level:  $632 (premium)
200 Level:  $450 (upper)
300 Level:  $280 (standard)
400 Level:  $150 (economy)
CLUB:       $550 (club)
PIT/FLOOR:  $95  (floor)
```

Prices are simulated per seat but can be configured per section or even individual seats.

### 5. Selection Management
- **Maximum limit**: 2 tickets per session (configurable)
- **Real-time updates**: UI updates immediately on selection
- **Price calculation**: Automatic total calculation
- **Seat exclusivity**: No double-booking

## Implementation Guide

### Setup

1. **Include scripts in HTML** (already done in `tickets-vegas.html`):
```html
<!-- Mobile manager (main) -->
<script src="seat-selection.js"></script>

<!-- Desktop manager (extends mobile) -->
<script src="desktop-seat-selection.js"></script>
```

2. **Required HTML Structure**:
```html
<!-- SVG with sections having these attributes -->
<svg>
  <path class="block map-section" 
        data-section-id="s_101"
        data-section-name="101">
  </path>
</svg>

<!-- Bottom sheet for mobile -->
<div class="bottom-sheet">
  <div class="ticket-list">
    <div id="ticketItems"></div>
  </div>
</div>

<!-- Desktop ticket panel -->
<div class="desktop-ticket-panel">
  <div id="desktopTicketList"></div>
</div>
```

3. **CSS Classes**: The system uses these classes for styling:
- `.map-section` - SVG section element
- `.is-available` - Available section
- `.sel` - Selected section (gold border)
- `.ticket-item` - Seat in ticket list
- `.ticket-item.active` - Selected seat
- `.purchase-summary` - Price summary
- `.purchase-btn` - Checkout button

## Usage Examples

### Basic Selection Flow (Mobile)

```javascript
// 1. Manager initializes automatically on page load
// 2. User clicks on a section on the map
// 3. Bottom sheet appears showing available seats
// 4. User clicks on seats to add them
// 5. Purchase summary updates with:
//    - Selected seat numbers (e.g., "A1, B2")
//    - Quantity (e.g., "2")
//    - Total price (e.g., "$1,264")
// 6. User clicks "Continue to Checkout"
```

### Accessing Selection Data

```javascript
// Get current selection summary
const summary = window.seatManager.getSelectedSeatsSummary();
console.log(summary);
// Output: { count: 2, total: 1264, seats: ['A1', 'B2'] }

// Get all selected seat objects
const selectedSeats = window.seatManager.selectedSeats;
selectedSeats.forEach(seat => {
  console.log(`${seat.row}${seat.number} - $${seat.price}`);
});

// Reset selection
window.seatManager.resetSelection();
```

### Customizing Prices

```javascript
// Modify pricing tiers
window.seatManager.pricingTiers = {
  '100': 750,    // Increase 100 level
  '200': 500,
  '300': 300,
  '400': 150,
  'CLUB': 600,
  'PIT': 100
};
```

### Customizing Max Tickets

```javascript
// Allow up to 6 tickets
window.seatManager.maxTickets = 6;
```

## Responsive Design

### Mobile (< 768px)
- Full-screen venue map
- Bottom sheet drawer for ticket selection
- Touch-friendly controls
- Vertical scrolling for ticket list

### Desktop (≥ 768px)
- 3-column layout
- Persistent sidebar with dates
- Large interactive map with zoom
- Right-side ticket panel
- Horizontal ticket list scrolling

**Breakpoint**: 768px (CSS media query)

## State Management

The system uses several state variables:

```javascript
class SeatSelectionManager {
  selectedSeats: Map          // { seatId => seatObject }
  selectedSections: Set       // { sectionId, ... }
  currentSection: Object      // { id, name }
  maxTickets: Number          // Default: 2
  seatAvailability: Object    // { sectionId => sectionData }
}
```

### State Updates
- **On section click**: Updates `currentSection`, displays ticket list
- **On seat click**: Adds/removes seat from `selectedSeats`
- **On selection change**: Updates purchase summary
- **On back button**: Clears `currentSection`, hides ticket list

## Event Flow Diagram

```
User Interaction
    ↓
Click Section on Map
    ↓
handleSectionClick() → displayTicketList()
    ↓
Bottom Sheet Shows Available Seats
    ↓
Click Seat
    ↓
handleSeatSelection() → Update selectedSeats Map
    ↓
updatePricingSummary() → Update UI
    ↓
Purchase Summary & Button Appear
    ↓
Click "Continue to Checkout"
    ↓
handleCheckout() → Proceed to Payment
```

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

1. **Event Delegation**: Uses direct event listeners on SVG sections
2. **Lazy Rendering**: Seat data generated on selection, not upfront
3. **DOM Updates**: Minimal DOM manipulation using innerHTML templates
4. **Data Structure**: Map for O(1) seat lookup vs Array for O(n)

## Debugging

### Check Selection State
```javascript
console.log('Selected:', window.seatManager.selectedSeats);
console.log('Summary:', window.seatManager.getSelectedSeatsSummary());
```

### Check Section Data
```javascript
console.log('Sections:', window.seatManager.seatAvailability);
```

### Monitor Events
```javascript
// All clicks logged to console
window.seatManager.handleDesktopSeatSelection = function(seat, el, id) {
  console.log('Selected:', seat);
  // ... rest of method
}
```

## Customization Guide

### Add Custom Seat Pricing
```javascript
// Modify in seat-selection.js
generateSeats(sectionId, total, available) {
  const seats = [];
  // ... existing code ...
  return seats.map((seat, idx) => ({
    ...seat,
    price: idx % 2 === 0 ? 500 : 400  // Alternating prices
  }));
}
```

### Change Color Scheme
Update CSS in `tickets-vegas.html`:
```css
.map-section.is-available[data-section-name="100"] {
  fill: rgba(180, 100, 50, 0.82); /* New color */
}
```

### Add Venue-Specific Logic
```javascript
// Override in your initialization
window.seatManager.extractLevel = function(sectionName) {
  // Custom logic for your venue
  return section.Level;
}
```

## Testing Checklist

- [ ] Click sections - bottom sheet appears
- [ ] Click back button - sheet returns to default view
- [ ] Select seat - item highlights and count increases
- [ ] Select max seats - alert shows
- [ ] Deselect seat - count decreases
- [ ] Price calculates correctly
- [ ] Checkout button enables/disables properly
- [ ] Works on mobile (< 768px)
- [ ] Works on desktop (≥ 768px)
- [ ] Hover tooltips appear
- [ ] Tooltip disappears on mouse leave
- [ ] SVG sections highlight on hover
- [ ] Zoom controls work on desktop

## Troubleshooting

### Bottom sheet not appearing
- Check: JavaScript loaded and no console errors
- Check: `data-section-id` attributes on SVG paths
- Check: `.is-available` class on sections

### Seats not selectable
- Check: Seat status is `available`
- Check: `maxTickets` not exceeded
- Check: Click event firing (check console)

### Prices not calculating
- Check: `getPriceForLevel()` returns correct value
- Check: Seat objects have `price` property

### Desktop layout not showing
- Check: Browser width ≥ 768px
- Check: `desktop-seat-selection.js` loaded
- Check: Desktop HTML elements present

## Future Enhancements

- 🔄 Real-time availability updates (WebSocket)
- 🎫 Saved cart/wishlist functionality
- 👥 Group booking interface
- 📊 Dynamic pricing based on demand
- 🔐 Seat hold/reservation timer
- 💳 Integrated payment processing
- ⭐ Seat quality ratings
- 🗺️ Seat view preview (3D)
- 📱 Native mobile app integration

## License

© 2024 Concert Ticketing System. All rights reserved.
