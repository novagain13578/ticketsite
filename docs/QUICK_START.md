# Quick Start: Concert Ticketing System

## 🚀 Getting Started (30 seconds)

### 1. Files You Need
```
concert/
├── tickets-vegas.html          (main page - opens in browser)
├── seat-selection.js           (mobile seat logic)
├── desktop-seat-selection.js   (desktop 3-column layout)
├── style.css                   (styling)
└── img/                        (images)
```

### 2. Open in Browser
Double-click `tickets-vegas.html` to open it in your browser.

### 3. That's It! 🎉
The system is **fully functional**. Try clicking on a seating section (colored areas on the map).

---

## 📱 Mobile View (< 768px width)

### How It Works

1. **See the map** - Colorful venue with sections
2. **Tap a section** - Bottom sheet slides up showing available seats
3. **Select seats** - Tap individual seats to add to cart
4. **Review total** - Price updates in real-time
5. **Checkout** - Click "Continue to Checkout" button

### Visual Indicators
- 🟦 **Blue sections** = Different price levels (lighter = cheaper)
- ✅ **Highlighted row/seat** = Available
- ❌ **Grayed out** = Sold out
- ⭐ **Gold border** = Your selection

---

## 💻 Desktop View (≥ 768px width)

### 3-Column Layout

```
┌─────────────────────────────────────────────────┐
│ Date Sidebar │    Interactive Map    │ Ticket Panel
│              │      (with zoom)       │ (Right side)
│ - May 8      │                        │ Section 101
│ - May 9 ✓    │  [+] [-] [Reset]       │ 7/10 Available
│              │                        │ - A1: $632
│              │   [Colored Sections]   │ - A2: $632
│              │                        │ - A3: $632
│              │                        │ (Price shown)
└─────────────────────────────────────────────────┘
```

### Features
- **Zoom in/out** the map with `+` and `−` buttons
- **Reset** button returns to original zoom
- **Click dates** on left to switch shows
- **Click seats** on right panel to add to cart

---

## 💰 Pricing by Section Level

| Level | Examples | Price |
|-------|----------|-------|
| 100 Level | Sections 101-109 | $632 |
| 200 Level | Sections 201-209 | $450 |
| 300 Level | Sections 301-316 | $280 |
| 400 Level | Sections 401-444 | $150 |
| CLUB | Sections CLUB 109-136 | $550 |
| FLOOR/PIT | Pit A, B, C, D | $95 |

---

## 🎯 Key Features

✅ **Two-step selection**
- Step 1: Click section
- Step 2: Select individual seats

✅ **Price updates in real-time**
- See total as you select seats

✅ **Maximum 2 tickets per order**
- (Configurable if needed)

✅ **Works on all devices**
- Mobile on iOS/Android
- Desktop/Laptop
- Tablets

✅ **Responsive design**
- Automatically switches layouts at 768px width

---

## 🔧 Customization Quick Tips

### Change Max Tickets (e.g., allow 6)
**In `seat-selection.js`, line ~5:**
```javascript
this.maxTickets = 6;  // was 2
```

### Change Prices
**In `seat-selection.js`, lines ~21-28:**
```javascript
this.pricingTiers = {
  '100': 800,     // 100 level (change from 632)
  '200': 550,     // 200 level (change from 450)
  // ... etc
};
```

### Change Colors
**In `tickets-vegas.html`, search for `.block.is-available`:**
```css
/* 400 level – change light blue to something else */
.block.is-available[data-section-name="401"] { 
  fill: rgba(255, 100, 100, 0.82); /* Red instead of blue */
}
```

---

## ❓ Troubleshooting

### "Sections not clickable"
- Make sure you're on the right layout (mobile or desktop)
- Check if section has `.is-available` class (unavailable sections are grayed out)

### "Bottom sheet not appearing"
- On mobile, tap a colored section
- Make sure JavaScript loaded (check browser console for errors)

### "Prices look wrong"
- Prices are randomized per seat
- Check `seatAvailability` in console: `window.seatManager.seatAvailability`

### "Desktop view not showing"
- Make browser window wider (must be ≥ 768px)
- Refresh page
- Check console for script loading errors

---

## 📊 Check What's Selected

In browser **Console** (F12):

```javascript
// See your current selections
window.seatManager.getSelectedSeatsSummary()

// Output: { count: 2, total: 1264, seats: ['A1', 'B2'] }
```

---

## 🎬 Demo Scenario

1. Open `tickets-vegas.html`
2. Resize browser to mobile size (< 768px)
3. Click on **Section 101** (light blue, upper left)
4. Bottom sheet appears with 8-12 available seats
5. Click **Row A, Seat 1**
6. Click **Row B, Seat 2**
7. See total price update to `$1,264` (2 × $632)
8. Click **"Continue to Checkout"**
9. Alert shows order summary

---

## 📈 What's Generated Automatically

The system automatically **randomizes**:
- ✅ Number of seats per section (8-12)
- ✅ Availability per section (some sold, some available)
- ✅ Which seats are sold (random per section)

This simulates a **live event** with varying availability.

---

## 🔗 System Flow

```
User Opens Page
    ↓
SeatSelectionManager Initializes
    ├─ Reads all SVG sections
    ├─ Generates seat data per section
    └─ Attaches click listeners
    ↓
User Clicks Section
    ↓
Bottom Sheet Opens / Ticket Panel Updates
    ├─ Shows available seats
    ├─ Shows prices
    └─ Highlights with interactive borders
    ↓
User Clicks Seat
    ↓
Seat Added to Selection
    ├─ Count increments
    ├─ Price updates
    └─ Checkout button enables
    ↓
User Clicks "Continue to Checkout"
    ↓
Order Summary Dialog
    └─ Ready for payment integration
```

---

## 📞 Questions?

Check `IMPLEMENTATION_GUIDE.md` for detailed technical documentation.

Key sections:
- **Architecture**: How the system is structured
- **Usage Examples**: How to access selection data
- **Customization Guide**: How to modify behavior
- **Testing Checklist**: What to verify
- **Troubleshooting**: Solutions to common issues

---

## ✨ What You Get

A **production-ready** concert ticketing interface with:

- 📱 **Mobile-first responsive design**
- 💻 **Desktop 3-column layout**
- 🎨 **Color-coded seating map**
- 💰 **Real-time pricing**
- ✅ **Selection management**
- 🔄 **State persistence**
- 📊 **Easy customization**

**That's it! Your seat selection system is ready.** 🎉
