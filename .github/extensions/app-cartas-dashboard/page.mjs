export function pageHtml(initial, label) {
  const safeLabel = escapeHtml(label || 'APP_CARTAS');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Painel APP_CARTAS</title>
  <style>
    :root{--navy:#163b64;--blue:#245d91;--cyan:#2d8cab;--ink:#1f2d3d;--muted:#667085;--line:#dce5ee;--paper:#f4f7fa;--green:#22805a;--amber:#a06a10;--red:#b43b3b}
    *{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:var(--paper);color:var(--ink)}
    .header{padding:22px 28px;background:linear-gradient(135deg,#173f6c,#28759a);color:white;display:flex;justify-content:space-between;align-items:center}
    .header h1{margin:0;font-size:24px}.header p{margin:5px 0 0;opacity:.86}
    main{padding:22px 28px;max-width:1180px;margin:auto}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
    .card{background:white;border:1px solid var(--line);border-radius:12px;padding:16px;box-shadow:0 5px 18px rgba(31,55,78,.06)}
    .premium-stat{--accent:#287bc0;--tint:#eaf4ff;position:relative;overflow:hidden;min-width:0;padding:16px;border:1px solid #e6ecf1;border-radius:16px;background:linear-gradient(145deg,#fff,#fbfcff);box-shadow:0 8px 24px #28374a0d}
    .premium-stat.pending-metric{--accent:#b77815;--tint:#fff5e3}.premium-stat.received-metric{--accent:#078a77;--tint:#e6f8f3}.premium-stat.late-metric{--accent:#c64e57;--tint:#fff0f2}
    .premium-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:36px}.premium-title{font-size:13px;font-weight:600;color:#526779}.premium-icon{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:11px;background:var(--tint);color:var(--accent)}
    .premium-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.premium-stat strong{display:block;margin:12px 0 13px;color:#21374b;font-size:27px;line-height:1}
    .premium-stat progress{display:block;width:100%;height:6px;border:0;border-radius:8px;overflow:hidden;background:#eaf0f4;color:var(--accent);accent-color:var(--accent)}.premium-stat progress::-webkit-progress-bar{background:#eaf0f4;border-radius:8px}.premium-stat progress::-webkit-progress-value{background:var(--accent);border-radius:8px}.premium-stat progress::-moz-progress-bar{background:var(--accent);border-radius:8px}
    .toolbar{display:flex;gap:10px;justify-content:flex-end;margin-bottom:12px}button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #78b7df;outline-offset:2px}
    .primary{background:var(--navy);color:white}.secondary{background:#e8eff6;color:var(--navy)}
    .records-card{overflow-x:auto}.records-card:focus-visible{outline:3px solid #78b7df;outline-offset:2px}
    table{width:100%;min-width:600px;border-collapse:collapse}th,td{text-align:left;padding:11px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;text-transform:uppercase;color:var(--muted)}
    .status{display:inline-block;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:700}.pending{background:#edf2f7;color:#526172}.received{background:#daf1e7;color:#176242}.late{background:#f8e4de;color:#93352d}
    dialog{width:min(520px,calc(100vw - 32px));border:0;border-radius:14px;padding:20px;box-shadow:0 18px 60px rgba(18,43,68,.28)}dialog::backdrop{background:rgba(22,43,62,.48);backdrop-filter:blur(4px)}
    label{display:block;font-size:13px;font-weight:700;margin:10px 0 5px}input,select,textarea{width:100%;border:1px solid #bdcad6;border-radius:8px;padding:9px;font:inherit}textarea{min-height:86px;resize:vertical}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
    #status{position:fixed;left:50%;top:18px;transform:translateX(-50%);background:#173f6c;color:white;border-radius:8px;padding:10px 16px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.2)}
    [hidden]{display:none!important}.empty{text-align:center;color:var(--muted);padding:28px}
    @media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}main,.header{padding:18px}.header{align-items:flex-start}.toolbar{justify-content:flex-start}table{font-size:13px}}
  </style>
</head>
<body>
  <header class="header"><div><h1>Painel de acompanhamento</h1><p>${safeLabel}</p></div></header>
  <main>
    <section class="stats" aria-label="Resumo">
      <article class="premium-stat"><div class="premium-top"><span class="premium-title">Total</span><span class="premium-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 12h8M8 16h8"/></svg></span></div><strong id="total">0</strong><progress id="progress-total" max="1" value="0" aria-label="Total de registros"></progress></article>
      <article class="premium-stat pending-metric"><div class="premium-top"><span class="premium-title">Pendentes</span><span class="premium-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h12M6 21h12M7 3c0 5 2 7 5 9-3 2-5 4-5 9M17 3c0 5-2 7-5 9 3 2 5 4 5 9"/></svg></span></div><strong id="pending">0</strong><progress id="progress-pending" max="1" value="0" aria-label="Pendentes do total"></progress></article>
      <article class="premium-stat received-metric"><div class="premium-top"><span class="premium-title">Entregues</span><span class="premium-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg></span></div><strong id="received">0</strong><progress id="progress-received" max="1" value="0" aria-label="Entregues do total"></progress></article>
      <article class="premium-stat late-metric"><div class="premium-top"><span class="premium-title">Em atraso</span><span class="premium-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span></div><strong id="late">0</strong><progress id="progress-late" max="1" value="0" aria-label="Em atraso do total"></progress></article>
    </section>
    <div class="toolbar"><button id="new-record" class="primary" type="button">Novo registro</button><button id="export-csv" class="secondary" type="button">Exportar CSV</button></div>
    <section class="card records-card" aria-label="Registros" tabindex="0">
      <table><thead><tr><th>Candidato</th><th>Comum</th><th>Situação</th><th>Observação</th><th>Ações</th></tr></thead><tbody id="rows"></tbody></table>
    </section>
  </main>
  <dialog id="record-dialog" aria-labelledby="dialog-title"><form id="record-form">
    <h2 id="dialog-title">Registro de acompanhamento</h2><input type="hidden" id="record-id">
    <label for="record-name">Candidato</label><input id="record-name" maxlength="160" required>
    <label for="record-common">Comum</label><input id="record-common" maxlength="160">
    <label for="record-status">Situação</label><select id="record-status"><option value="pending">Pendente</option><option value="received">Entregue</option><option value="late">Em atraso</option></select>
    <label for="record-note">Observação</label><textarea id="record-note" maxlength="500"></textarea>
    <div class="actions"><button type="button" id="cancel-record" class="secondary">Cancelar</button><button type="submit" class="primary">Salvar</button></div>
  </form></dialog>
  <div id="status" role="status" aria-live="polite" hidden></div>
  <script>/*__CLIENT_SCRIPT__*/</script>
</body></html>`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
