const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEMP_PROFILE = 'C:\\Users\\main\\.gemini\\antigravity-ide\\scratch\\edge-overflow';
if (!fs.existsSync(TEMP_PROFILE)) fs.mkdirSync(TEMP_PROFILE, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9224',
    `--user-data-dir=${TEMP_PROFILE}`,
    'http://localhost:3000',
  ]);

  await sleep(2000);
  const res = await fetch('http://127.0.0.1:9224/json');
  const targets = await res.json();
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);

  await new Promise((resolve) => (ws.onopen = resolve));

  // Set 360px viewport
  ws.send(
    JSON.stringify({
      id: 1,
      method: 'Emulation.setDeviceMetricsOverride',
      params: { width: 360, height: 740, deviceScaleFactor: 2, mobile: true },
    })
  );

  await sleep(2000);

  // Check overflow
  const evalMsg = {
    id: 2,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const docWidth = document.documentElement.clientWidth;
        const bad = [];
        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth + 1) {
            bad.push({
              tag: el.tagName,
              className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
              id: el.id,
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              text: el.textContent ? el.textContent.trim().slice(0, 40) : '',
            });
          }
        });
        return {
          clientWidth: docWidth,
          scrollWidth: document.documentElement.scrollWidth,
          overflowElements: bad,
        };
      })()`,
      returnByValue: true,
    },
  };

  ws.send(JSON.stringify(evalMsg));

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.id === 2) {
      console.log('Result:', JSON.stringify(data.result?.result?.value, null, 2));
      ws.close();
      edgeProcess.kill();
      process.exit(0);
    }
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
