import type { HealthStatus } from './health.types';

function statusLabel(status: HealthStatus['status']): string {
  return status === 'ok' ? 'Operacyjny' : 'Niedostępny';
}

function iconDatabase(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>`;
}

function iconClock(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
}

function iconServer(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="1" fill="currentColor" stroke="none"/></svg>`;
}

function statCard(
  icon: string,
  label: string,
  value: string,
  accent: 'navy' | 'green' | 'bronze',
): string {
  return `
    <div class="stat-card accent-${accent}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-body">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
}

function detailRow(label: string, value: string, good?: boolean): string {
  const cls = good === undefined ? '' : good ? 'good' : 'bad';
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value ${cls}">${value}</span></div>`;
}

export function renderHealthPage(data: HealthStatus, logoUrl: string): string {
  const isOk = data.status === 'ok';
  const dbOk = data.database.connected;
  const formattedTime = new Date(data.timestamp).toLocaleString('pl-PL', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ClearNest — Status usługi</title>
  <link rel="icon" href="${logoUrl}" />
  <style>
    :root {
      --bg: #f6f2e9;
      --paper: #ffffff;
      --ink: #1e241f;
      --ink-soft: #5b6259;
      --line: #ded5c0;
      --navy: #233a5e;
      --navy-soft: #3c5a85;
      --bronze: #a6763c;
      --green: #3e6156;
      --green-soft: #e8f0ec;
      --red: #9c4a3c;
      --red-soft: #f9ecea;
      --blue-soft: #eef3f9;
      --shadow: 0 4px 24px rgba(35, 58, 94, 0.08);
      --radius: 16px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(160deg, var(--bg) 0%, #ebe4d4 45%, #f6f2e9 100%);
      color: var(--ink);
      min-height: 100vh;
      line-height: 1.5;
    }

    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 2.5rem 1.25rem 3rem;
    }

    .hero {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: calc(var(--radius) + 4px);
      box-shadow: var(--shadow);
      padding: 2rem 2rem 1.75rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      inset: 0 0 auto 0;
      height: 4px;
      background: linear-gradient(90deg, var(--navy), var(--bronze), var(--green));
    }

    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .logo-wrap img {
      height: 56px;
      width: auto;
      object-fit: contain;
    }

    .logo-wrap h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--navy);
      letter-spacing: -0.02em;
    }

    .logo-wrap h1 span {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--ink-soft);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 0.15rem;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.55rem 1.15rem;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.95rem;
      margin-top: 0.5rem;
    }

    .status-pill.ok {
      background: var(--green-soft);
      color: var(--green);
      border: 1px solid rgba(62, 97, 86, 0.2);
    }

    .status-pill.error {
      background: var(--red-soft);
      color: var(--red);
      border: 1px solid rgba(156, 74, 60, 0.2);
    }

    .pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(62, 97, 86, 0.45); }
      70% { box-shadow: 0 0 0 10px rgba(62, 97, 86, 0); }
      100% { box-shadow: 0 0 0 0 rgba(62, 97, 86, 0); }
    }

    .status-pill.error .pulse { animation-name: pulse-red; }
    @keyframes pulse-red {
      0% { box-shadow: 0 0 0 0 rgba(156, 74, 60, 0.45); }
      70% { box-shadow: 0 0 0 10px rgba(156, 74, 60, 0); }
      100% { box-shadow: 0 0 0 0 rgba(156, 74, 60, 0); }
    }

    .timestamp {
      margin-top: 0.75rem;
      color: var(--ink-soft);
      font-size: 0.875rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin: 1.75rem 0;
    }

    .stat-card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 1.15rem;
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      box-shadow: var(--shadow);
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .stat-icon svg { width: 22px; height: 22px; }

    .accent-navy .stat-icon { background: var(--blue-soft); color: var(--navy); }
    .accent-green .stat-icon { background: var(--green-soft); color: var(--green); }
    .accent-bronze .stat-icon { background: #f5ede0; color: var(--bronze); }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--navy);
      line-height: 1.1;
    }

    .stat-label {
      font-size: 0.78rem;
      color: var(--ink-soft);
      margin-top: 0.2rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .panel {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #faf8f3, var(--paper));
    }

    .panel-header svg {
      width: 20px;
      height: 20px;
      color: var(--navy);
    }

    .panel-header h2 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--navy);
    }

    .panel-body { padding: 0.5rem 1.25rem 1rem; }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.65rem 0;
      border-bottom: 1px solid rgba(222, 213, 192, 0.5);
      font-size: 0.9rem;
    }

    .detail-row:last-child { border-bottom: none; }

    .detail-label { color: var(--ink-soft); }

    .detail-value {
      font-weight: 600;
      color: var(--ink);
      text-align: right;
    }

    .detail-value.good { color: var(--green); }
    .detail-value.bad { color: var(--red); }

    .footer {
      text-align: center;
      margin-top: 2rem;
      color: var(--ink-soft);
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="logo-wrap">
        <img src="${logoUrl}" alt="ClearNest" />
        <h1>ClearNest<span>Status usługi</span></h1>
      </div>
      <div class="status-pill ${isOk ? 'ok' : 'error'}">
        <span class="pulse"></span>
        ${statusLabel(data.status)}
      </div>
      <p class="timestamp">Ostatnia aktualizacja: ${formattedTime}</p>
    </section>

    <div class="grid">
      ${statCard(iconClock(), 'Czas pracy', data.uptime.formatted, 'bronze')}
      ${statCard(iconDatabase(), 'Magazyn danych', dbOk ? 'Dostępny' : 'Niedostępny', dbOk ? 'green' : 'navy')}
    </div>

    <article class="panel">
      <div class="panel-header">${iconServer()}<h2>Podsumowanie</h2></div>
      <div class="panel-body">
        ${detailRow('API', isOk ? 'Działa poprawnie' : 'Wymaga uwagi', isOk)}
        ${detailRow('Magazyn danych', dbOk ? 'Połączono' : 'Brak połączenia', dbOk)}
        ${detailRow('Wersja API', `v${data.api.version}`)}
      </div>
    </article>

    <p class="footer">ClearNest · Wszystkie systemy monitorowane automatycznie</p>
  </div>
</body>
</html>`;
}
