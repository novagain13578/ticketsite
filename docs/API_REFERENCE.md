# Developer API Reference

## Accessing the Managers

```javascript
// Mobile seat manager
window.seatManager

// Desktop seat manager (extends seatManager)
window.desktopManager
```

---

## Core Methods

### Getting Selection Data

#### `getSelectedSeatsSummary()`
Returns current selection state.

```javascript
const summary = window.seatManager.getSelectedSeatsSummary();

// Returns:
{
  count: 2,                    // Number of seats selected
  total: 1264,                 // Total price in dollars
  seats: ['A1', 'B2']          // Array of seat labels (Row + Number)
}
```

**Use Case**: Send to backend for checkout
```javascript
fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify(window.seatManager.getSelectedSeatsSummary())
});
```

### Managing Selection

#### `resetSelection()`
Clear all selected seats.

```javascript
window.seatManager.resetSelection();
// Clears: selectedSeats, selectedSections, currentSection
// Updates: UI reverts to default state
```

---

## Properties

### `selectedSeats` (Map)
Map of seat IDs to seat objects.

```javascript
window.seatManager.selectedSeats

// Structure:
Map [
  'seat-1' => { id, row, number, status, price },
  'seat-2' => { id, row, number, status, price }
]

// Iterate over selections
window.seatManager.selectedSeats.forEach((seat, seatId) => {
  console.log(`Row ${seat.row}, Seat ${seat.number}: $${seat.price}`);
});
```

### `seatAvailability` (Object)
Contains all section data.

```javascript
window.seatManager.seatAvailability

// Structure:
{
  's_101': {
    name: '101',
    level: '100',
    totalSeats: 10,
    availableSeats: 7,
    price: 632,
    seats: [...]  // Array of seat objects
  }
}
```

### `selectedSections` (Set)
Currently selected section IDs.

```javascript
window.seatManager.selectedSections
// Set { 's_101', ... }
```

### `maxTickets` (Number)
Maximum tickets allowed per order.

```javascript
window.seatManager.maxTickets  // Default: 2

// Modify:
window.seatManager.maxTickets = 6;
```

### `pricingTiers` (Object)
Base prices per seating level.

```javascript
window.seatManager.pricingTiers

// Structure:
{
  '100': 632,     // 100 Level
  '200': 450,     // 200 Level
  '300': 280,     // 300 Level
  '400': 150,     // 400 Level
  'CLUB': 550,    // Club sections
  'PIT': 95       // Floor/Pit
}

// Modify prices:
window.seatManager.pricingTiers['100'] = 750;
```

---

## Integration Examples

### Example 1: Add to Shopping Cart

```javascript
function addToCart() {
  const summary = window.seatManager.getSelectedSeatsSummary();
  
  if (summary.count === 0) {
    alert('Please select seats');
    return;
  }
  
  // Call your API
  fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: 'morgan-wallen-indianapolis',
      date: '2026-05-09',
      seats: summary.seats,
      total: summary.total
    })
  })
  .then(r => r.json())
  .then(data => {
    alert(`Added ${summary.count} tickets to cart!`);
    window.seatManager.resetSelection();
  });
}

// Call from checkout button
document.getElementById('purchaseBtn').onclick = addToCart;
```

### Example 2: Check Availability in Real-Time

```javascript
function checkAvailability() {
  const sections = window.seatManager.seatAvailability;
  
  Object.entries(sections).forEach(([id, section]) => {
    if (section.availableSeats > 0) {
      console.log(
        `Section ${section.name}: ` +
        `${section.availableSeats}/${section.totalSeats} available @ $${section.price}`
      );
    }
  });
}
```

### Example 3: Enforce Price Range

```javascript
function enforceMaxPrice(maxPrice) {
  const original = window.seatManager.pricingTiers;
  
  Object.entries(original).forEach(([level, price]) => {
    if (price > maxPrice) {
      window.seatManager.pricingTiers[level] = maxPrice;
    }
  });
}

enforceMaxPrice(500);  // Cap all prices at $500
```

### Example 4: Monitor Selection Changes

```javascript
// Use Mutation Observer to watch for changes
const observer = new MutationObserver(() => {
  const summary = window.seatManager.getSelectedSeatsSummary();
  console.log('Selection updated:', summary);
  
  // Update your UI
  document.getElementById('cart-total').textContent = `$${summary.total}`;
});

observer.observe(document.getElementById('ticketList'), {
  childList: true,
  subtree: true
});
```

### Example 5: Dynamic Pricing

```javascript
// Price based on demand
function setPricingByDemand(availabilityPercent) {
  const basePrices = {
    '100': 632,
    '200': 450,
    '300': 280,
    '400': 150,
    'CLUB': 550,
    'PIT': 95
  };
  
  const multiplier = availabilityPercent < 20 ? 1.5 : 
                     availabilityPercent < 50 ? 1.2 : 1.0;
  
  Object.entries(basePrices).forEach(([level, price]) => {
    window.seatManager.pricingTiers[level] = Math.round(price * multiplier);
  });
}

setPricingByDemand(15);  // High demand → 1.5x price increase
```

---

## Event Handling

### Custom Events on Selection

```javascript
// Override selection handler to add custom logic
const original = window.seatManager.handleSeatSelection;

window.seatManager.handleSeatSelection = function(event, element, sectionId) {
  // Call original
  original.call(this, event, element, sectionId);
  
  // Your custom logic
  const summary = this.getSelectedSeatsSummary();
  
  // Log for analytics
  console.log('Selection changed:', summary);
  
  // Update external UI
  document.getElementById('seat-count').textContent = summary.count;
};
```

### Detect Section Selection

```javascript
const originalClick = window.seatManager.handleSectionClick;

window.seatManager.handleSectionClick = function(sectionElement) {
  originalClick.call(this, sectionElement);
  
  // Fired when user selects a section
  const sectionId = sectionElement.getAttribute('data-section-id');
  const sectionName = sectionElement.getAttribute('data-section-name');
  
  console.log(`Selected section: ${sectionName}`);
  
  // Your tracking code
  gtag('event', 'section_selected', {
    section: sectionName,
    price: this.seatAvailability[sectionId].price
  });
};
```

---

## Useful Queries

### Get all available sections
```javascript
Object.entries(window.seatManager.seatAvailability).filter(
  ([_, section]) => section.availableSeats > 0
).map(([id, section]) => ({
  name: section.name,
  available: section.availableSeats,
  price: section.price
}));
```

### Find cheapest available seats
```javascript
const allSeats = Object.values(
  window.seatManager.seatAvailability
).flatMap(s => s.seats).filter(s => s.status === 'available');

const cheapest = allSeats.reduce((min, seat) => 
  seat.price < min.price ? seat : min
);

console.log(`Cheapest: Row ${cheapest.row}, Seat ${cheapest.number} @ $${cheapest.price}`);
```

### Filter by price range
```javascript
const budget = 400;
const affordable = Object.entries(
  window.seatManager.seatAvailability
).filter(([_, section]) => section.price <= budget && section.availableSeats > 0)
.map(([id, section]) => section.name);

console.log('Affordable sections:', affordable);
```

---

## Common Patterns

### Pattern 1: Validate Before Checkout

```javascript
function validateOrder() {
  const summary = window.seatManager.getSelectedSeatsSummary();
  
  if (summary.count < 1) {
    console.error('No seats selected');
    return false;
  }
  
  if (summary.count > 6) {
    console.error('Too many seats');
    return false;
  }
  
  if (summary.total > 10000) {
    console.error('Order exceeds maximum price');
    return false;
  }
  
  return true;
}
```

### Pattern 2: Save and Restore Cart

```javascript
// Save selection to localStorage
function saveCart() {
  const summary = window.seatManager.getSelectedSeatsSummary();
  localStorage.setItem('cart', JSON.stringify(summary));
}

// Restore from localStorage
function restoreCart() {
  const saved = localStorage.getItem('cart');
  if (saved) {
    const summary = JSON.parse(saved);
    console.log('Restored:', summary);
    // Note: Actual restoration would require rebuilding selectedSeats Map
  }
}
```

### Pattern 3: Session Timeout

```javascript
let timeout;

function resetTimeout() {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    alert('Session expired. Clearing selections...');
    window.seatManager.resetSelection();
  }, 15 * 60 * 1000); // 15 minutes
}

// Reset timeout on every selection change
document.addEventListener('click', (e) => {
  if (e.target.closest('.ticket-item')) {
    resetTimeout();
  }
});
```

---

## Desktop-Specific Methods

### `setupMapPanel()`
Clones the SVG map for desktop view.

### `setupTicketPanel()`
Initializes the right-side ticket listing panel.

### `displayDesktopTickets(sectionId)`
Populates desktop ticket panel with available seats.

### `applyZoom(container, zoomLevel)`
Applies zoom transformation to the venue map.

```javascript
// Programmatic zoom
window.desktopManager?.applyZoom(
  document.getElementById('desktopMapMount'), 
  1.5  // 150% zoom
);
```

---

## Debugging Utilities

### Log All State
```javascript
function logState() {
  const sm = window.seatManager;
  console.group('Seat Manager State');
  console.log('Selected Seats:', sm.selectedSeats);
  console.log('Summary:', sm.getSelectedSeatsSummary());
  console.log('All Sections:', sm.seatAvailability);
  console.log('Max Tickets:', sm.maxTickets);
  console.log('Pricing:', sm.pricingTiers);
  console.groupEnd();
}
```

### Simulate Selection
```javascript
async function simulateSelection() {
  const sections = Object.values(window.seatManager.seatAvailability);
  
  for (const section of sections.slice(0, 2)) {
    const available = section.seats.filter(s => s.status === 'available');
    if (available.length > 0) {
      const seat = available[0];
      window.seatManager.selectedSeats.set(seat.id, seat);
    }
  }
  
  window.seatManager.updatePricingSummary();
}
```

---

## Performance Tips

1. **Don't constantly call `getSelectedSeatsSummary()`**
   - Cache the result if used multiple times
   - Recalculate only when selection changes

2. **Use Set/Map for seat lookups**
   - `selectedSeats.has(id)` is O(1)
   - Array.find() is O(n)

3. **Debounce event handlers**
   - Prevent rapid updates
   - Batch DOM operations

Example:
```javascript
let updateTimeout;

function updateUI() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    const summary = window.seatManager.getSelectedSeatsSummary();
    document.getElementById('total').textContent = `$${summary.total}`;
  }, 100);
}
```

---

## Version Info

- **Version**: 1.0
- **Last Updated**: 2024
- **Mobile Support**: iOS 12+, Android 6+
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Support

For issues or questions, refer to:
- `QUICK_START.md` - Simple usage guide
- `IMPLEMENTATION_GUIDE.md` - Detailed architecture
- Browser console - Check for JavaScript errors
