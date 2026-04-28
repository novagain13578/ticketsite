# Troubleshooting & FAQ

## Common Issues

### "Seats not appearing when I click a section"

**Problem**: Click a section, but no tickets show in the bottom sheet.

**Causes & Solutions**:

1. **JavaScript not running**
   - Check browser console (F12 → Console tab)
   - Look for red errors
   - Verify `<script>` tags are in `tickets-vegas.html`:
     ```html
     <script src="seat-selection.js"></script>
     <script src="desktop-seat-selection.js"></script>
     ```

2. **Section has no available seats**
   - RandomGenerator may have marked all seats as "sold"
   - Try clicking a different section (101, 102, 200L, etc.)
   - Each section randomly generates 8-12 seats with random availability

3. **HTML modified after download**
   - Make sure `<div class="bottom-sheet" id="bottomSheet">` exists
   - Verify `<div id="ticketList">` is inside bottom sheet
   - Don't rename or remove element IDs

**To Debug**:
```javascript
// In browser console
console.log(window.seatManager.seatAvailability);

// Look for sections with availableSeats > 0
```

---

### "Click doesn't work on map sections"

**Problem**: Clicking colored sections does nothing.

**Causes & Solutions**:

1. **SVG not rendering**
   - Open `tickets-vegas.html` in browser
   - Check if you see the colored venue map
   - If not, SVG file may be broken or path incorrect

2. **Click event not registered**
   - Make sure sections have `data-section-id` attribute
   - Example: `<path data-section-id="s_101" data-section-name="101">`
   - System requires BOTH attributes

3. **JavaScript loading order**
   - Ensure scripts load AFTER the `<body>` HTML
   - Should appear near end of file before closing `</body>`

4. **Only `.is-available` sections are clickable**
   - Check SVG classes: `<path class="block map-section is-available">`
   - If `.is-available` is missing, section won't be clickable
   - Sold-out sections have only `class="block map-section"`

**To Debug**:
```javascript
// In browser console
const sections = document.querySelectorAll('.block.map-section.is-available');
console.log(`Available sections: ${sections.length}`);

// Check for an individual section
const test = document.querySelector('[data-section-id="s_101"]');
console.log('Section 101:', test);
```

---

### "Bottom sheet covers content / not scrolling"

**Problem**: Bottom sheet won't scroll, or tickets are cut off.

**Causes & Solutions**:

1. **CSS z-index conflict**
   - Bottom sheet z-index is `999` by default
   - If other elements have higher z-index, bottom sheet hides
   - Solution: Reduce other elements' z-index or increase bottom sheet to `1001`

2. **Height overflow**
   - Check CSS: `.bottom-sheet { max-height: 60vh; overflow-y: auto; }`
   - If max-height too small, content can't fit
   - Increase `max-height` value (e.g., `70vh` or `80vh`)

3. **Mobile responsiveness issue**
   - On phones < 768px, bottom sheet should slide up from bottom
   - On desktop, should be a persistent panel
   - If not working, check media queries in `style.css`

**To Debug**:
```javascript
// In browser console
const sheet = document.getElementById('bottomSheet');
console.log('Height:', sheet.offsetHeight);
console.log('Z-index:', getComputedStyle(sheet).zIndex);
```

---

### "Price showing $0 or not updating"

**Problem**: Total price doesn't calculate or stays at $0.

**Causes & Solutions**:

1. **Seats have no price**
   - Each seat should have a `price` property
   - Check that `pricingTiers` has entries for all section levels:
     ```javascript
     {
       '100': 632, '200': 450, '300': 280, '400': 150,
       'CLUB': 550, 'PIT': 95
     }
     ```

2. **No seats actually selected**
   - Clicking a seat should highlight it in gold
   - Check `selectedSeats` Map in console:
     ```javascript
     console.log(window.seatManager.selectedSeats);
     ```
   - If empty, seats aren't being added to selection

3. **JavaScript error preventing calculations**
   - Open browser console (F12)
   - Look for red error messages
   - Fix any JavaScript syntax errors in `seat-selection.js`

**To Debug**:
```javascript
// In browser console
const summary = window.seatManager.getSelectedSeatsSummary();
console.log('Summary:', summary);

// Check pricing tiers
console.log('Prices:', window.seatManager.pricingTiers);
```

---

### "Maximum ticket limit not working"

**Problem**: Can select more than 2 seats when max should be 2.

**Causes & Solutions**:

1. **Limit not enforced in code**
   - Check `seat-selection.js` `handleSeatSelection()` method
   - Should have this check:
     ```javascript
     if (this.selectedSeats.size >= this.maxTickets) {
       alert(`You can only select up to ${this.maxTickets} seats`);
       return;
     }
     ```

2. **Default limit is 2 (check if acceptable)**
   - If you need different limit, modify in browser console:
     ```javascript
     window.seatManager.maxTickets = 4;  // Allow 4 tickets
     ```

3. **Limit applies to different things than expected**
   - Limit counts individual seats, not sections
   - Selecting section 101 (adds 1 ticket) + section 102 (adds 1) = 2 total

**To Debug**:
```javascript
// Check current max
console.log(window.seatManager.maxTickets);

// Change limit
window.seatManager.maxTickets = 8;
```

---

### "Works on desktop but not mobile (or vice versa)"

**Problem**: Layout/functionality works in one size but not the other.

**Causes & Solutions**:

1. **Viewport not set**
   - HTML must have:
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     ```
   - Without this, mobile won't scale correctly

2. **Wrong breakpoint**
   - System uses `768px` breakpoint:
     - **Mobile** (< 768px): Bottom sheet interface
     - **Desktop** (≥ 768px): 3-column layout
   - If your device is between, behavior may be unexpected
   - Browser DevTools → Toggle Device Toolbar (Ctrl+Shift+M) to test different sizes

3. **CSS media queries not working**
   - Check `media (max-width: 768px)` in `style.css`
   - On mobile, `.three-column-layout` should be hidden
   - Bottom sheet should be visible and floating

4. **DesktopSeatManager loading on mobile**
   - Manager only initializes on screens ≥ 768px
   - On mobile, falls back to base `SeatSelectionManager`
   - If desktop features show on mobile, something's overriding the check

**To Debug**:
```javascript
// Check window width
console.log('Window width:', window.innerWidth);

// Check which manager loaded
console.log('Mobile manager:', window.seatManager);
console.log('Desktop manager:', window.desktopManager);
```

---

### "Checkout button says "disabled" or doesn't appear"

**Problem**: "Continue to Checkout" button is grayed out or hidden.

**Causes & Solutions**:

1. **No seats selected**
   - Button only appears when seats are selected
   - Button is disabled until you pick at least 1 seat
   - Solution: Click a section, then click a seat

2. **Button hidden by CSS**
   - Check CSS for:
     ```css
     .purchase-btn { display: none; }
     ```
   - Should be `display: none` by default
   - Changes to `display: block` when seats selected

3. **JavaScript error in handleCheckout**
   - Open browser console
   - Click "Continue to Checkout"
   - Check for error messages
   - Verify function exists in HTML

4. **Button element not found**
   - Verify in HTML: `<button class="purchase-btn" id="purchaseBtn">`
   - Must have both `class` and `id` attributes

**To Debug**:
```javascript
// In browser console
const btn = document.getElementById('purchaseBtn');
console.log('Button element:', btn);
console.log('Display style:', btn.style.display);
```

---

### "Click seats - nothing happens"

**Problem**: Seat in the ticket list doesn't highlight when clicked.

**Causes & Solutions**:

1. **HTML structure changed**
   - Each seat needs: `<div class="ticket-item" data-seat-id="...">`
   - System looks for click events on `.ticket-item`
   - Check HTML or generated code

2. **Event listener not attached**
   - Check `handleSeatSelection()` method
   - Verify `.ticket-item` elements get click listeners attached
   - May be generated dynamically; check `displayTicketList()` method

3. **CSS doesn't show selection**
   - Highlight should be golden/yellow on click
   - Check CSS for `.ticket-item.selected` styling
   - If not styled, seat may be selected but not visibly

4. **Duplicate event listeners**
   - If code runs twice, listeners may conflict
   - Scripts may be included twice in HTML
   - Check: Only one `<script src="seat-selection.js">` needed
   - Only one `<script src="desktop-seat-selection.js">` needed

**To Debug**:
```javascript
// Simulate clicking all seats
document.querySelectorAll('.ticket-item').forEach(item => {
  console.log('Seat:', item.getAttribute('data-seat-id'));
});
```

---

### "Zoom controls don't work (desktop)"

**Problem**: Zoom in/out buttons on desktop don't magnify the map.

**Causes & Solutions**:

1. **Desktop layout not loading**
   - Desktop manager only loads on screens ≥ 768px
   - If window < 768px, desktop features don't exist
   - Resize or use larger device

2. **Zoom buttons not found**
   - Check HTML for:
     ```html
     <button id="desktopZoomIn">+</button>
     <button id="desktopZoomOut">-</button>
     <button id="desktopResetBtn">Reset</button>
     ```
   - Must have exact IDs

3. **SVG not cloning to desktop mount**
   - Check for: `<div id="desktopMapMount"></div>`
   - SVG should clone into this element
   - If not, map won't appear and zoom won't work

4. **Transform CSS not applied**
   - Zoom works by applying `transform: scale()`
   - Check browser DevTools → Elements tab
   - Verify SVG has `style="transform: scale(...)"`

**To Debug**:
```javascript
// On desktop (≥ 768px)
console.log('Desktop manager:', window.desktopManager);

const mount = document.getElementById('desktopMapMount');
console.log('Map mount:', mount);
console.log('Cloned SVG:', mount?.querySelector('svg'));
```

---

### "Page loads too slowly"

**Problem**: Takes forever to open tickets-vegas.html.

**Causes & Solutions**:

1. **Large or broken image file**
   - If `img/` folder has huge images, page loads slowly
   - Check file sizes: Right-click image → Properties
   - Optimize if > 2MB per image

2. **Too many seats generating**
   - System generates random seats (8-12 per section)
   - If many sections (20+), can lag
   - Solution: Reduce sections or pre-generate data

3. **Browser DevTools open**
   - DevTools window slows JavaScript execution
   - Close the console (F12) and reload

4. **Real-time availability queries**
   - If integrated with API, slow API calls block loading
   - Check network tab (F12 → Network) for slow requests

**To Debug**:
```javascript
// Time execution
console.time('Loading');

// ... your code ...

console.timeEnd('Loading');

// Check sections generated
console.log(Object.keys(window.seatManager.seatAvailability).length);
```

---

## FAQ

### **Q: Can I change the prices?**
**A:** Yes! Modify `pricingTiers` in `seat-selection.js`:
```javascript
pricingTiers = {
  '100': 750,    // Changed from 632
  '200': 500,    // Changed from 450
  // ... etc
}
```

Or dynamically:
```javascript
window.seatManager.pricingTiers['100'] = 750;
```

---

### **Q: How do I limit to 1 seat per order?**
**A:** Change `maxTickets`:
```javascript
window.seatManager.maxTickets = 1;
```

---

### **Q: Can I connect this to a real database?**
**A:** Yes! Replace `initializeSeatData()` in `seat-selection.js`:
```javascript
initializeSeatData() {
  fetch('/api/event/seats')  // Your API
    .then(r => r.json())
    .then(data => {
      this.seatAvailability = data.sections;
    });
}
```

---

### **Q: How do I add more sections?**
**A:** Sections come from SVG `<path>` elements in `tickets-vegas.html`:
```html
<path class="block map-section is-available" 
      data-section-id="s_CUSTOM" 
      data-section-name="Custom Section"
      d="...">
</path>
```

Add new path with unique `data-section-id` and `data-section-name`.

---

### **Q: Do seats save when I refresh?**
**A:** No, seats are cleared on refresh. To save:
```javascript
// Save before leaving
window.addEventListener('beforeunload', () => {
  const summary = window.seatManager.getSelectedSeatsSummary();
  localStorage.setItem('savedSeats', JSON.stringify(summary));
});

// Restore on load (in seat-selection.js init)
const saved = localStorage.getItem('savedSeats');
if (saved) {
  // Parse and restore...
}
```

---

### **Q: How do I change colors?**
**A:** Edit `style.css`. Look for:
```css
/* SVG section colors */
.block.map-section.is-available {
  fill: #1f77b4;  /* Blue */
}

.block.map-section.sel {
  filter: drop-shadow(0 0 8px gold);  /* Selection glow */
}
```

---

### **Q: Works locally but not on hosting?**
**A:**
1. Check all file paths are relative: `src="seat-selection.js"` not `src="/concert/seat-selection.js"`
2. Verify all files uploaded: `index.html`, `style.css`, `tickets-vegas.html`, `seat-selection.js`, `desktop-seat-selection.js`, `img/` folder
3. Check browser console for 404 errors (F12)
4. If using API, verify CORS headers on backend

---

### **Q: How do I integrate Stripe?**
**A:** Replace `handleCheckout()` in `seat-selection.js`:
```javascript
handleCheckout(summary) {
  fetch('/api/create-payment-intent', {
    method: 'POST',
    body: JSON.stringify({
      amount: summary.total * 100,  // Cents
      seats: summary.seats
    })
  })
  .then(r => r.json())
  .then(data => {
    // Launch Stripe dialog with data.clientSecret
  });
}
```

---

### **Q: Can I test different prices?**
**A:** Yes! In browser console:
```javascript
window.seatManager.pricingTiers = {
  '100': 999,
  // ... rest
};

window.seatManager.resetSelection();
```

---

### **Q: Mobile view not showing bottom sheet?**
**A:** 
1. Resize window to < 768px (use DevTools → Toggle Device Toolbar)
2. Refresh page
3. Click a section → bottom sheet should slide up
4. If not, check console (F12) for errors

---

## Getting Help

**For technical issues:**
1. Open browser console (F12 → Console tab)
2. Check for red error messages
3. Try the debug commands under each issue above
4. Review source code in `seat-selection.js` or `desktop-seat-selection.js`

**For customization:**
1. See `API_REFERENCE.md` for all available methods
2. See `IMPLEMENTATION_GUIDE.md` for architecture details
3. See `QUICK_START.md` for feature overview

**For business logic:**
1. Check `pricingTiers` for price configuration
2. Check `maxTickets` for selection limits
3. Check `seatAvailability` structure for section/seat organization
