const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\main\\.gemini\\antigravity-ide\\brain\\ed050855-5a5d-4044-bcca-18fb21c4fbce';
const TEMP_PROFILE = 'C:\\Users\\main\\.gemini\\antigravity-ide\\scratch\\edge-profile';

if (!fs.existsSync(TEMP_PROFILE)) {
  fs.mkdirSync(TEMP_PROFILE, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
  }

  async connect() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    });
    return res.result?.value;
  }

  async screenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
    console.log(`✓ Screenshot saved: ${outputPath}`);
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('Starting Edge process with remote debugging port 9222...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_PROFILE}`,
    'http://localhost:3000',
  ]);

  // Wait for remote debugging to be ready
  let targets = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch {
      // retry
    }
  }

  if (!targets || targets.length === 0) {
    throw new Error('Failed to connect to Edge remote debugging port');
  }

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('DOM.enable');

  try {
    // 1. Desktop Homepage
    console.log('\n1. Capturing Desktop Homepage...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2500);
    await client.screenshot(path.join(ARTIFACTS_DIR, 'desktop_homepage.png'));

    // 2. Search / Filter State (Click 'Tech' Category Pill)
    console.log('\n2. Capturing Search / Filter State...');
    await client.eval(`
      const techBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Tech');
      if (techBtn) techBtn.click();
    `);
    await sleep(600);
    await client.screenshot(path.join(ARTIFACTS_DIR, 'search_filter_state.png'));

    // Reset filter
    await client.eval(`
      const allBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'All');
      if (allBtn) allBtn.click();
    `);
    await sleep(300);

    // 3. Calendar View
    console.log('\n3. Capturing Calendar View...');
    await client.eval(`
      const calTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Full Calendar'));
      if (calTab) calTab.click();
    `);
    await sleep(800);
    // Switch to Month view
    await client.eval(`
      const monthBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Month'));
      if (monthBtn) monthBtn.click();
    `);
    await sleep(600);
    await client.screenshot(path.join(ARTIFACTS_DIR, 'calendar_view.png'));

    // 4. Campus Switcher
    console.log('\n4. Capturing Campus Switcher...');
    await client.eval(`
      const feedTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes("What's Happening"));
      if (feedTab) feedTab.click();
    `);
    await sleep(500);
    await client.eval(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Apex Institute'));
      if (btn) btn.click();
    `);
    await sleep(500);
    await client.screenshot(path.join(ARTIFACTS_DIR, 'campus_switcher.png'));

    // 5. Event Detail Page
    console.log('\n5. Capturing Event Detail Page...');
    await client.send('Page.navigate', {
      url: 'http://localhost:3000/events/systems-programming-rust-study-jam',
    });
    await sleep(2500);
    await client.screenshot(path.join(ARTIFACTS_DIR, 'event_detail.png'));

    // 6. Mobile Homepage (390x844)
    console.log('\n6. Capturing Mobile Homepage (390x844)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await client.send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2500);

    const overflow390 = await client.eval(`
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    `);
    console.log(`390px has horizontal overflow: ${overflow390}`);
    await client.screenshot(path.join(ARTIFACTS_DIR, 'mobile_homepage.png'));

    // Test 360px (Case 10)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 740,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(500);
    const overflow360 = await client.eval(`
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    `);
    console.log(`360px has horizontal overflow (Case 10): ${overflow360}`);

    console.log('\n===========================================');
    console.log('ALL VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log('===========================================');
  } finally {
    client.close();
    edgeProcess.kill();
  }
}

main().catch((err) => {
  console.error('Fatal CDP capture error:', err);
  process.exit(1);
});
