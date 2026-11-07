'use strict';

/**
 * ⚡ DANPHE NATIVE — LIVE WIFI DASHBOARD & OTA HUB TEMPLATE
 * Extracted from DevServer.js for modular scaling & maintainability.
 */

function renderLiveDashboardHtml(opts) {
  const {
    bundle,
    port,
    localIP,
    httpPort,
    apk,
    apkSize,
    apkMtime,
    apkTimestamp,
    wifiDownloadUrl,
    cppDownloadUrl
  } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Danphe Native | Live WiFi Dashboard & OTA Hub</title>
  <style>
    :root {
      --bg-color: #0b1120;
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.1);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 'Inter', sans-serif;
    }

    body {
      background: var(--bg-color);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.15), transparent 30%),
        radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.15), transparent 30%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 2rem 2.5rem;
      text-align: center;
      border-bottom: 1px solid var(--card-border);
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    header h1 {
      font-weight: 800;
      font-size: 2.3rem;
      background: linear-gradient(135deg, #38bdf8, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
      letter-spacing: -0.5px;
    }

    header p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .nav-pills {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    main {
      flex: 1;
      max-width: 1350px;
      margin: 0 auto;
      padding: 2.5rem;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 2rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 2rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .card:hover {
      transform: translateY(-3px);
      border-color: rgba(56, 189, 248, 0.35);
    }

    .card h2 {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #ffffff;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-online { background-color: var(--success); box-shadow: 0 0 12px var(--success); }
    .status-offline { background-color: var(--danger); box-shadow: 0 0 12px var(--danger); }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 0;
      border-bottom: 1px solid var(--card-border);
    }
    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 1.02rem;
    }

    .stat-value {
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 1.1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 1rem 1.6rem;
      border-radius: 12px;
      font-size: 1.15rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: opacity 0.2s ease, transform 0.1s ease;
      width: 100%;
      margin-top: 1.25rem;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }

    .btn:hover { opacity: 0.93; }
    .btn:active { transform: scale(0.98); }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      box-shadow: none;
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.16); }

    .btn-blue {
      background: linear-gradient(135deg, #0284c7, #38bdf8);
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);
    }

    /* QR Code Container */
    .qr-box {
      margin-top: 1.25rem;
      padding: 1rem;
      background: #ffffff;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .qr-caption {
      margin-top: 8px;
      color: #1e293b;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
    }

    /* Device List */
    .device-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .device-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.1rem 1.35rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .device-info h4 {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .device-info p {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-top: 0.25rem;
    }

    .badge {
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.2);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.4);
    }

    .empty-state {
      text-align: center;
      color: var(--text-muted);
      padding: 2.5rem 0;
      font-size: 1.1rem;
      font-style: italic;
    }

    @media (max-width: 768px) {
      header { padding: 1.25rem !important; }
      header h1 { font-size: 1.8rem !important; }
      main { padding: 1.25rem !important; gap: 1.25rem !important; }
      .card { grid-column: span 1 !important; padding: 1.35rem !important; }
      .device-item { flex-direction: column; align-items: flex-start; gap: 8px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>🦚 Danphe Native Dashboard</h1>
    <p>Direct JSX Pipeline ➔ Kotlin Android, Samsung ThorVG/LVGL C++ & Web over Titan Bus</p>
    <div class="nav-pills">
      <a href="/dashboard" class="btn btn-blue" style="padding: 10px 22px; font-size: 1rem; width: auto; margin:0;">🦚 Live Server & Device Monitor</a>
      <a href="/download-apk?t=${apkTimestamp}" class="btn" style="padding: 10px 22px; font-size: 1rem; width: auto; margin:0;">📱 Download Android APK</a>
      <a href="/download-cpp" class="btn btn-secondary" style="padding: 10px 22px; font-size: 1rem; width: auto; margin:0;">⚡ Download LVGL C++</a>
    </div>
  </header>

  <main>

      </div>
    </div>
    <!-- 1. Server Network Monitor Card -->
    <div class="card">
      <h2>
        <span id="server-indicator" class="status-indicator status-online"></span>
        Server & Network Monitor
      </h2>
      <div class="stat-row">
        <span class="stat-label">WiFi Server IP</span>
        <span class="stat-value" id="stat-ip" style="color: var(--accent);">${localIP}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">TCP Port (Android App)</span>
        <span class="stat-value" id="stat-tcp" style="color: var(--success);">${port || 9091}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">HTTP Dashboard Port</span>
        <span class="stat-value" id="stat-http">${httpPort || 9090}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">UDP Auto-Discovery</span>
        <span class="stat-value" style="color: var(--warning);">Port 9092</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">UI Binary Bundle</span>
        <span class="stat-value" id="stat-bundle">${bundle ? bundle.length.toLocaleString() : '313'} bytes</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Heartbeat Ping</span>
        <span class="stat-value" style="color: var(--success);">8.0s Active</span>
      </div>
    </div>

    <!-- 2. Client APK WiFi Download Card with QR Code -->
    <div class="card">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#10b981" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        Android Client APK (WiFi OTA)
      </h2>
      <div class="stat-row">
        <span class="stat-label">Package Name</span>
        <span class="stat-value" id="stat-apk-package">${apk || 'DanpheNative-1.0.0.apk'}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">APK Size</span>
        <span class="stat-value" id="stat-apk-size" style="color: var(--success);">${apkSize} MB</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Build Timestamp</span>
        <span class="stat-value" id="stat-apk-time" style="color: var(--warning);">${apkMtime}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">WiFi Target URL</span>
        <span class="stat-value" style="color: var(--accent); font-size: 0.95rem;">${wifiDownloadUrl}</span>
      </div>

      <a id="apk-download-btn" href="/download-apk?t=${apkTimestamp}" download class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        Download ${apk || 'APK'} (${apkSize} MB)
      </a>

      <!-- Instant Phone Scan QR Code -->
      <div class="qr-box">
        <canvas id="qr-canvas" width="160" height="160"></canvas>
        <span class="qr-caption">📷 Scan with phone camera to download APK via WiFi</span>
      </div>
    </div>

    <!-- 3. Samsung ThorVG & LVGL 9 C++ Screen Pack -->
    <div class="card">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#38bdf8" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/></svg>
        Samsung ThorVG / LVGL 9 Screen
      </h2>
      <div class="stat-row">
        <span class="stat-label">C++ Target</span>
        <span class="stat-value" style="color: var(--accent);">ThorVG 0.12 + LVGL 9</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Source File</span>
        <span class="stat-value" style="color: var(--success);">danphe_thorvg_screen.cpp</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Target Hardware</span>
        <span class="stat-value" style="color: var(--warning);">ESP32-S3 / STM32 / Watch</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Titan Bus Wire</span>
        <span class="stat-value" style="color: var(--accent);">16-bit Hardware Registers</span>
      </div>

      <a id="cpp-download-btn" href="/download-cpp" download class="btn btn-blue">
        ⚡ Download danphe_thorvg_screen.cpp
      </a>
    </div>

    <!-- 4. Connected Devices Live Monitor -->
    <div class="card" style="grid-column: 1 / -1;">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#38bdf8" viewBox="0 0 16 16"><path d="M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4-2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zM9 8a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4A.5.5 0 0 1 9 8zm1 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zM1 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8.96c.026-.163.04-.33.04-.5C9 10.567 7.21 9 5 9c-2.086 0-3.8 1.398-3.984 3.181A1.006 1.006 0 0 1 1 12V4z"/></svg>
        Live Connected Devices (TCP Socket & OTA Flow)
      </h2>
      <div id="device-list" class="device-list">
        <div class="empty-state">No devices currently connected. Open Danphe Native App on Android to connect automatically.</div>
      </div>
    </div>
  </main>

  <!-- Lightweight Standalone QR Code Generator Script -->
  <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>
  <script>
    // Fallback QR code generator if CDN is unavailable offline
    function renderQRCode(text) {
      if (typeof QRious !== 'undefined') {
        new QRious({
          element: document.getElementById('qr-canvas'),
          value: text,
          size: 160,
          background: '#ffffff',
          foreground: '#0b1120'
        });
      } else {
        // Draw graceful fallback on canvas
        const canvas = document.getElementById('qr-canvas');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, 160, 160);
          ctx.fillStyle = '#0f172a';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('WiFi URL:', 80, 70);
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#0284c7';
          ctx.fillText(location.hostname + ':${httpPort || 9090}', 80, 95);
        }
      }
    }

    renderQRCode('${wifiDownloadUrl}');

    async function fetchServerStatus() {
      try {
        const res = await fetch('/dolphin/server');
        if (res.ok) {
          const data = await res.json();
          document.getElementById('server-indicator').className = 'status-indicator status-online';

          const ipList = data.ips && data.ips.length > 0 ? data.ips.join(', ') : '${localIP}';
          document.getElementById('stat-ip').innerText = ipList;
          document.getElementById('stat-tcp').innerText = data.tcpPort || '${port || 9091}';

          if (data.apkName) {
            document.getElementById('stat-apk-package').innerText = data.apkName;
            const sizeMb = (data.apkSize / (1024 * 1024)).toFixed(2);
            document.getElementById('stat-apk-size').innerText = sizeMb + ' MB';
            if (data.apkMtime) {
              const dt = new Date(data.apkMtime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' });
              const elTime = document.getElementById('stat-apk-time');
              if (elTime) elTime.innerText = dt;
            }
            const btn = document.getElementById('apk-download-btn');
            if (btn) {
              btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg> Download ' + data.apkName + ' (' + sizeMb + ' MB)';
              btn.href = '/download-apk?t=' + (data.apkMtime ? new Date(data.apkMtime).getTime() : Date.now());
            }
          }

          const deviceContainer = document.getElementById('device-list');
          if (!data.devices || data.devices.length === 0) {
            deviceContainer.innerHTML = '<div class="empty-state">No devices currently connected over TCP ${port || 9091}. Open Danphe Native app on phone to connect.</div>';
          } else {
            deviceContainer.innerHTML = data.devices.map(function(dev) {
              const connectedTime = new Date(dev.connectedAt).toLocaleTimeString();
              return '<div class="device-item">' +
                '<div class="device-info">' +
                  '<h4>📱 Android Device Socket: ' + dev.id + '</h4>' +
                  '<p>IP Address: <strong>' + dev.addr + '</strong> · Active Screen: <strong>' + dev.screen + '</strong> · Connected: ' + connectedTime + '</p>' +
                '</div>' +
                '<span class="badge">🟢 CONNECTED</span>' +
              '</div>';
            }).join('');
          }
        }
      } catch (err) {
        document.getElementById('server-indicator').className = 'status-indicator status-offline';
      }
    }

    fetchServerStatus();
    setInterval(fetchServerStatus, 5000);
  </script>


</body>
</html>`;
}

module.exports = { renderLiveDashboardHtml };
