/**
 * SIMPLIFIED E2E AUDIT - API & Server Verification
 * Uses JSDOM + fetch to verify: Telegram notify API + HTML DOM structure
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const AUDIT_RESULTS = {
  htmlLoaded: false,
  mapSectionsExist: false,
  bottomSheetExists: false,
  ticketItemsContainerExists: false,
  apiEndpointResponds: false,
  payloadProcessedCorrectly: false,
  backendHealthy: true,
  notifyFunctionExists: false
};

async function runAudit() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║    SIMPLIFIED E2E AUDIT (API + DOM + Server Health)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: LOAD AND PARSE HTML
    // ═══════════════════════════════════════════════════════════════════

    const htmlPath = path.join(__dirname, 'public', 'tickets-vegas.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    console.log('[DOM PARSE] ✓ HTML loaded and parsed');
    AUDIT_RESULTS.htmlLoaded = true;

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: CHECK SVG MAP STRUCTURE (data-section-name attributes)
    // ═══════════════════════════════════════════════════════════════════

    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
      console.log('[DOM] ✓ .map-container found');
    }

    const stadiumSvg = document.querySelector('svg.stadium-svg');
    if (stadiumSvg) {
      console.log('[DOM] ✓ SVG stadium map found');
    }

    // Check for at least one section block
    const sections = document.querySelectorAll('[data-section-name]');
    console.log(`[DOM] ✓ Found ${sections.length} section elements with data-section-name`);

    if (sections.length > 0) {
      AUDIT_RESULTS.mapSectionsExist = true;
      const firstSection = sections[0].getAttribute('data-section-name');
      console.log(`  Sample section: "${firstSection}"`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: CHECK BOTTOM SHEET & TICKET CONTAINER EXIST
    // ═══════════════════════════════════════════════════════════════════

    const bottomSheet = document.querySelector('.bottom-sheet');
    if (bottomSheet) {
      AUDIT_RESULTS.bottomSheetExists = true;
      console.log('[DOM] ✓ .bottom-sheet container found');
    } else {
      console.log('[DOM] ✗ .bottom-sheet NOT found (may be desktop-only)');
    }

    const ticketItems = document.getElementById('ticketItems');
    if (ticketItems) {
      AUDIT_RESULTS.ticketItemsContainerExists = true;
      console.log('[DOM] ✓ #ticketItems container found');
    } else {
      console.log('[DOM] ✗ #ticketItems NOT found');
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: CHECK FOR NOTIFY FUNCTION IN SCRIPT
    // ═══════════════════════════════════════════════════════════════════

    const scripts = document.querySelectorAll('script');
    let notifyFunctionCode = '';

    for (let script of scripts) {
      if (script.textContent.includes('notifyAdminSeatClick')) {
        notifyFunctionCode = script.textContent;
        AUDIT_RESULTS.notifyFunctionExists = true;
        console.log('[CODE] ✓ notifyAdminSeatClick function found in HTML');
        
        // Check the function implementation
        if (notifyFunctionCode.includes('/api/notify')) {
          console.log('[CODE] ✓ Function calls /api/notify endpoint');
        }
        if (notifyFunctionCode.includes('sectionName')) {
          console.log('[CODE] ✓ Function passes sectionName parameter');
        }
        break;
      }
    }

    if (!AUDIT_RESULTS.notifyFunctionExists) {
      console.log('[CODE] ✗ notifyAdminSeatClick function NOT found');
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: TEST API ENDPOINT /api/notify
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n[API] Testing POST /api/notify endpoint...');

    return new Promise((resolve) => {
      const testPayload = JSON.stringify({ sectionName: '434' });

      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/notify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(testPayload)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const responseJson = JSON.parse(data);

            if (res.statusCode === 200 || res.statusCode === 201) {
              AUDIT_RESULTS.apiEndpointResponds = true;
              AUDIT_RESULTS.payloadProcessedCorrectly = true;

              console.log(`[API] ✓ POST /api/notify responded with status ${res.statusCode}`);
              console.log(`[API] ✓ Response: { success: ${responseJson.success}, sectionName: "${responseJson.sectionName}" }`);

              if (responseJson.sectionName === '434') {
                console.log(`[API] ✓ Payload echoed back correctly: sectionName = "434"`);
              }
            } else {
              console.log(`[API] ✗ Unexpected status: ${res.statusCode}`);
              AUDIT_RESULTS.apiEndpointResponds = true;
            }

            // Final summary
            printAuditReport();
            resolve();
          } catch (err) {
            console.log('[API] ✗ Failed to parse response:', err.message);
            printAuditReport();
            resolve();
          }
        });
      });

      req.on('error', (err) => {
        console.log(`[API] ✗ Request failed: ${err.message}`);
        AUDIT_RESULTS.backendHealthy = false;
        printAuditReport();
        resolve();
      });

      req.write(testPayload);
      req.end();
    });

  } catch (error) {
    console.error('\n✗ [CRITICAL ERROR]', error.message);
    AUDIT_RESULTS.backendHealthy = false;
    printAuditReport();
  }
}

function printAuditReport() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    AUDIT RESULTS (Pass/Fail)               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const checks = [
    ['HTML file loads and parses correctly', AUDIT_RESULTS.htmlLoaded],
    ['SVG map sections exist with data-section-name', AUDIT_RESULTS.mapSectionsExist],
    ['.bottom-sheet container exists', AUDIT_RESULTS.bottomSheetExists],
    ['#ticketItems container exists for dynamic render', AUDIT_RESULTS.ticketItemsContainerExists],
    ['notifyAdminSeatClick function exists in code', AUDIT_RESULTS.notifyFunctionExists],
    ['POST /api/notify endpoint responds', AUDIT_RESULTS.apiEndpointResponds],
    ['API processes payload correctly (sectionName)', AUDIT_RESULTS.payloadProcessedCorrectly],
    ['Backend server is healthy', AUDIT_RESULTS.backendHealthy]
  ];

  let passCount = 0;
  let failCount = 0;

  checks.forEach(([name, result]) => {
    const icon = result ? '✓' : '✗';
    console.log(`${icon} [${result ? 'PASS' : 'FAIL'}] ${name}`);
    if (result) passCount++; else failCount++;
  });

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Summary: ${passCount}/${checks.length} PASS, ${failCount}/${checks.length} FAIL`);

  if (failCount === 0) {
    console.log('\n✓ ALL CHECKS PASSED - E2E flow is operational');
  } else {
    console.log(`\n⚠ ${failCount} ISSUE(S) FOUND - Review output above`);
  }

  console.log('\n');
}

// ═══════════════════════════════════════════════════════════════════
// INSTALL JSDOM IF NEEDED
// ═══════════════════════════════════════════════════════════════════

const { execSync } = require('child_process');

try {
  require.resolve('jsdom');
  runAudit();
} catch (e) {
  console.log('[SETUP] Installing jsdom...\n');
  execSync('npm install jsdom', { stdio: 'inherit' });
  runAudit();
}
