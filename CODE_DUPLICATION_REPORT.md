# 🔍 Code Duplication Report
**Date:** April 25, 2026  
**Scope:** Full codebase analysis  
**Severity:** MEDIUM - Refactoring recommended

---

## Executive Summary

**Total Duplicates Found:** 13  
**Critical Issues:** 7  
**High Priority:** 4  
**Low Priority:** 2  

Primary problem: Multiple code sections exist in `tickets-vegas.html` with different implementations of the same logic.

---

## 1. CRITICAL DUPLICATES

### 1.1 `updateCheckoutUI()` - Defined TWICE (Different Implementations)

**Location 1:** [tickets-vegas.html#L2325](tickets-vegas.html#L2325)
```javascript
function updateCheckoutUI() {
  const count = checkoutArray.length;
  const baseTotal = checkoutArray.reduce((sum, t) => sum + t.price, 0);
  const grandTotal = baseTotal * quantityMultiplier;
  
  const checkoutBar = document.getElementById('checkout-bar');
  const checkoutCounter = document.getElementById('checkout-counter');
  const checkoutTotal = document.getElementById('checkout-total');
  const payBtn = document.getElementById('checkout-pay-btn');
  
  // Show/hide checkout bar
  if (count === 0) {
    if (checkoutBar) checkoutBar.classList.add('hidden');
    return;
  }
  
  if (checkoutBar) checkoutBar.classList.remove('hidden');
  if (checkoutCounter) checkoutCounter.textContent = count;
  if (checkoutTotal) checkoutTotal.textContent = `$${grandTotal.toFixed(2)}`;
  // ... plus more logic for payBtn handler
}
```

**Location 2:** [tickets-vegas.html#L2810](tickets-vegas.html#L2810) - **SECOND VERSION**
```javascript
function updateCheckoutUI() {
  const count = checkoutArray.length;
  const baseTotal = checkoutArray.reduce((s, t) => s + t.price, 0);
  const grandTotal = baseTotal * quantityMultiplier;

  const bar = document.getElementById('checkout-bar');
  const counter = document.getElementById('checkout-counter');
  const totalEl = document.getElementById('checkout-total');
  const ps = document.getElementById('purchaseSummary');
  const pb = document.getElementById('purchaseBtn');

  if (count === 0) { 
    if(bar) bar.classList.add('hidden'); 
    if(ps) ps.style.display = 'none';
    if(pb) pb.style.display = 'none';
    return; 
  }
  
  // Updates checkout bar AND bottom sheet summary
  if(bar) bar.classList.remove('hidden');
  if(counter) counter.textContent = count;
  if(totalEl) totalEl.textContent = `$${grandTotal.toFixed(2)}`;
  
  if (ps) {
    ps.style.display = 'block';
    const seats = checkoutArray.map(t => `Sec ${t.section} Row ${t.row}`);
    document.getElementById('selectedSeats').textContent = seats.join(', ');
    document.getElementById('seatCount').textContent = count;
    document.getElementById('totalPrice').textContent = `$${grandTotal.toLocaleString()}`;
  }
  if (pb) {
    pb.style.display = 'block';
    pb.disabled = false;
  }
}
```

**Also in:** [public/index.html#L1987](public/index.html#L1987) - Third implementation

**Status:** ⚠️ **CRITICAL** - Second version is more complete  
**Recommendation:** Keep Location 2 (line 2810), delete Location 1 (line 2325)

---

### 1.2 `getPrice()` - Defined Multiple Times

**Location 1:** [tickets-vegas.html#L2414](tickets-vegas.html#L2414)
```javascript
function getPrice(name) {
  if (!name) return 150;
  if (name.startsWith('PIT'))  return 680;
  if (/^[ABC]/.test(name))     return 1200;
  if (name.startsWith('CLUB')) return 350;
  const n = parseInt(name);
  if (n >= 400) return 81;
  if (n >= 300) return 130;
  if (n >= 200) return 210;
  if (n >= 100) return 380;
  return 150;
}
```

**Location 2:** [tickets-vegas.html#L2796](tickets-vegas.html#L2796) - **IDENTICAL COPY**

**Also in:** [public/index.html#L2038](public/index.html#L2038) - Same implementation

**Status:** ⚠️ **CRITICAL** - Exact duplicates  
**Recommendation:** Keep one in global scope, delete duplicates (delete lines 2796 from tickets-vegas.html and 2038 from index.html)

---

### 1.3 `quantityMultiplier` - Declared TWICE

**Location 1:** [tickets-vegas.html#L2167](tickets-vegas.html#L2167)
```javascript
let quantityMultiplier = 1; // Global quantity selector (1-8)
```

**Location 2:** [tickets-vegas.html#L2793](tickets-vegas.html#L2793) - **DECLARED AGAIN**
```javascript
let quantityMultiplier = 1; // Default value matching the HTML select
```

**Status:** ⚠️ **CRITICAL** - Causes undefined behavior  
**Recommendation:** Delete line 2793, keep only line 2167

---

### 1.4 `openCheckoutModal()` vs `openCheckoutGateway()`

**Location 1 (Old):** [tickets-vegas.html#L2908](tickets-vegas.html#L2908)
```javascript
function openCheckoutModal() {
  // Old Cash App modal logic - references #cashappModal
}
```

**Location 2 (New):** [tickets-vegas.html#L2908](tickets-vegas.html#L2908)
```javascript
function openCheckoutGateway() {
  // New multi-method gateway logic - references #checkoutGatewayModal
}
```

**Status:** ✅ **ACCEPTABLE** - Different purposes but confusing naming  
**Recommendation:** Remove `openCheckoutModal()` entirely (not called), keep `openCheckoutGateway()`

---

### 1.5 `checkoutArray.push()` - Duplicated 4 Times

**Locations in tickets-vegas.html:**
- Line 2309 - Inside ticket click handler
- Line 2477 - Inside different event context
- Line 2578 - Inside another context
- Line 2874 - Inside event delegation

**Pattern (should be normalized):**
```javascript
checkoutArray.push({
  id: id,
  section: ticketItem.dataset.section,
  row: ticketItem.dataset.row,
  price: parseInt(ticketItem.dataset.price)
});
```

**Status:** ⚠️ **HIGH** - Multiple entry points for same action  
**Recommendation:** Consolidate into single `addToCart(ticket)` function

---

### 1.6 Quantity Selector Event Listener - DUPLICATED

**Location 1:** [tickets-vegas.html#L2169](tickets-vegas.html#L2169)
```javascript
const quantitySelector = document.getElementById('quantity-selector');
if (quantitySelector) {
  quantitySelector.addEventListener('change', (e) => {
    quantityMultiplier = parseInt(e.target.value);
    console.log('📊 Quantity changed to:', quantityMultiplier);
    updateCheckoutUI();
  });
}
```

**Location 2:** [tickets-vegas.html#L2848](tickets-vegas.html#L2848) - **DUPLICATE**
```javascript
const qtySelect = document.getElementById('quantity-selector');
if (qtySelect) {
  quantityMultiplier = parseInt(qtySelect.value);
  qtySelect.addEventListener('change', e => {
    quantityMultiplier = parseInt(e.target.value);
    updateCheckoutUI();
  });
}
```

**Status:** ⚠️ **HIGH** - Listener attached twice  
**Recommendation:** Delete lines 2848-2857, keep lines 2169-2177

---

### 1.7 Checkout Bar Event Listeners - DUPLICATED

**Multiple locations attach handlers to same elements:**
- `document.getElementById('checkout-pay-btn')?.addEventListener('click', openCheckoutGateway);` - Line 2886
- Similar patterns appear in old modal code

**Status:** ⚠️ **HIGH** - Risk of duplicate event firing  
**Recommendation:** Audit all event listener attachments, consolidate

---

## 2. HIGH PRIORITY DUPLICATES

### 2.1 Modal Backdrop Click Handler

**Appears in multiple places:**
- Inline close button
- Backdrop click handler
- Both trying to do the same thing

**Status:** ⚠️ **HIGH** - Redundant  
**Recommendation:** Single centralized modal close function

---

### 2.2 Checkout Total Calculation

**Duplicated in 6 places:**
```javascript
const baseTotal = checkoutArray.reduce((s, t) => s + t.price, 0);
const grandTotal = baseTotal * quantityMultiplier;
```

**Status:** ⚠️ **MEDIUM** - Refactor into utility function  
**Recommendation:** Create `calculateCheckoutTotal()` function

---

### 2.3 Empty Cart Check

**Duplicated in multiple contexts:**
```javascript
if (checkoutArray.length === 0) {
  // hide UI elements
  return;
}
```

**Status:** ⚠️ **MEDIUM** - Extract into `hasItems()` or similar

---

## 3. BACKEND DUPLICATES

### 3.1 Upload Endpoint Duplication

**In routes/checkout.js:**
- `uploadCheckoutProof()` - New endpoint

**In routes/cashapp.js:**
- Similar upload logic exists

**Status:** ✅ **ACCEPTABLE** - Different payment flows, but monitor for consolidation opportunities

---

## 4. SUMMARY TABLE

| Issue | Location(s) | Severity | Impact | Fix |
|-------|-----------|----------|--------|-----|
| `updateCheckoutUI()` duplicate | L2325, L2810, index#L1987 | CRITICAL | Logic conflicts | Keep L2810, delete others |
| `getPrice()` duplicate | L2414, L2796, index#L2038 | CRITICAL | Redundancy | Keep L2414, delete L2796 |
| `quantityMultiplier` redeclare | L2167, L2793 | CRITICAL | Scope conflict | Delete L2793 |
| `openCheckoutModal()` orphaned | L2361 | CRITICAL | Dead code | Delete |
| `checkoutArray.push()` x4 | L2309, L2477, L2578, L2874 | HIGH | Multiple entry points | Consolidate |
| Quantity listener x2 | L2169, L2848 | HIGH | Double attachment | Delete L2848 |
| Total calculation x6 | Multiple | MEDIUM | Redundancy | Extract to function |
| Empty cart check x5 | Multiple | MEDIUM | Redundancy | Extract to function |

---

## 5. RECOMMENDED REFACTORING ORDER

### Phase 1 (Immediate - CRITICAL)
1. Delete `openCheckoutModal()` (orphaned, unused)
2. Delete second `quantityMultiplier` declaration (line 2793)
3. Delete second `getPrice()` definition (line 2796)
4. Delete first `updateCheckoutUI()` definition (line 2325)
5. Delete duplicate quantity listener (lines 2848-2857)

### Phase 2 (High Priority)
1. Consolidate `checkoutArray.push()` into `addToCart()` function
2. Create `calculateCheckoutTotal()` utility
3. Create `isCartEmpty()` helper
4. Centralize modal close logic

### Phase 3 (Quality)
1. Extract common calculation patterns
2. Consider moving checkout logic to separate JS file
3. Professional code review before production

---

## 6. RECOMMENDATIONS

✅ **Do Not Create** additional documentation files - consolidate here  
✅ **Run** automated duplicate detection  
✅ **Test Thoroughly** after removals - checkout is critical path  
✅ **Consider** extracting checkout logic to `js/checkout-manager.js`  
✅ **Merge** index.html and tickets-vegas.html logic (currently split)  

---

**Generated:** April 25, 2026  
**Impact:** Low (duplicates are non-conflicting but create maintenance burden)  
**Next Steps:** Run Phase 1 removals, test, proceed to Phase 2 refactoring
