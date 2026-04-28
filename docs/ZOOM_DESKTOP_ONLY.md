# Zoom System: Desktop Only

## Why Zoom Isn't Working

Your **viewport is currently < 768px** (mobile or narrow window):
- ✅ SVG found: true (140 sections)
- ❌ Map container visible: false (0x0 dimensions)
- 📱 **Zoom system skipped on mobile**

## The Fix: Switch to Desktop View

The zoom system only initializes on **desktop viewport ≥ 768px**, matching the main app's responsive design.

### Option 1: Resize Browser Window
Simply widen your browser to at least 768px width. The zoom system will auto-initialize when you resize above the breakpoint.

### Option 2: Use DevTools Device Toggle
1. Press **Ctrl+Shift+M** (Windows) or **Cmd+Shift+M** (Mac)
2. This toggles responsive design mode
3. Change viewport to desktop size (> 768px)
4. Page will automatically mount desktop map and initialize zoom

### Option 3: Check in Console
After resizing to desktop:
```javascript
window.debugZoom.status()
```

Should show:
- Viewport width: ≥ 768px (✅ Desktop)
- Manager created: true
- Manager initialized: true
- SVG found: true
- Clickable sections: 140

## Test Zoom

Once in desktop view (≥ 768px):
```javascript
window.debugZoom.testZoom()
```

This zooms to the first section and shows the zoom header.

## Technical Details

The page has responsive layouts:
- **Mobile (< 768px)**: `.desktop-center-col { display: none !important; }`
- **Desktop (≥ 768px)**: Desktop layout shown, SVG cloned from mobile view

The zoom system intentionally skips initialization on mobile because:
1. Map container is hidden (display: none)
2. SVG is never cloned into desktopMapMount
3. Zoom controls wouldn't be visible anyway

When page resizes from mobile → desktop (or vice versa):
- Existing toggle between layouts handles style changes
- Zoom system auto-initializes if window becomes ≥ 768px

## Verification Checklist

✅ Browser window ≥ 768px wide
✅ DevTools closed or not taking up more than half the screen
✅ Page shows "Interactive Seat Map" header (desktop layout visible)
✅ Run `window.debugZoom.status()` shows desktop mode
✅ Run `window.debugZoom.testZoom()` shows zoom animation
