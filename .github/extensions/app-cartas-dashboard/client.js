let records = [];
let refreshVersion = 0;
const dialog = document.querySelector('#record-dialog');
const form = document.querySelector('#record-form');
const status = document.querySelector('#status');
const statusLabels = {pending:'Pendente',received:'Entregue',late:'Em atraso'};

function announce(message) {
  status.textContent = message;
  status.hidden = false;
  setTimeout(() => { status.hidden = true; }, 2600);
}

function render() {
  const counts = {total:records.length,pending:0,received:0,late:0};
  for (const record of records) if (Object.hasOwn(statusLabels, record.status)) counts[record.status]++;
  for (const [key, count] of Object.entries(counts)) {
    document.querySelector('#'+key).textContent = count;
    const bar = document.querySelector('#progress-'+key);
    bar.max = Math.max(counts.total, 1);
    bar.value = count;
  }
  const rows = document.querySelector('#rows');
  rows.replaceChildren();
  if (!records.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" class="empty">Nenhum registro cadastrado.</td>';
    rows.append(tr);
    return;
  }
  for (const record of records) {
    const tr = document.createElement('tr');
    const name = document.createElement('td'), common = document.createElement('td');
    const situation = document.createElement('td'), note = document.createElement('td'), actions = document.createElement('td');
    name.textContent = record.name;
    common.textContent = record.common || '—';
    note.textContent = record.note || '—';
    const badge = document.createElement('span');
    badge.className = 'status';
    const knownStatus = Object.hasOwn(statusLabels, record.status);
    if (knownStatus) badge.classList.add(record.status);
    badge.textContent = knownStatus ? statusLabels[record.status] : 'Situação desconhecida';
    situation.append(badge);
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'secondary edit'; edit.dataset.id = record.id; edit.textContent = 'Editar';
    actions.append(edit); tr.append(name, common, situation, note, actions);
    rows.append(tr);
  }
}

async function refreshRecords() {
  const version = ++refreshVersion;
  const response = await fetch('/api/state', { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível carregar.');
  if (version !== refreshVersion) return;
  records = result.records;
  render();
}

function refresh() {
  refreshRecords().catch(error => announce(error.message));
}

document.querySelector('#new-record').addEventListener('click', () => {
  form.reset();
  document.querySelector('#record-id').value = '';
  dialog.showModal();
});
document.querySelector('#cancel-record').addEventListener('click', () => dialog.close());
form.addEventListener('submit', async event => {
  event.preventDefault();
  const input = {
    id: document.querySelector('#record-id').value || undefined,
    name: document.querySelector('#record-name').value.trim(),
    common: document.querySelector('#record-common').value.trim(),
    status: document.querySelector('#record-status').value,
    note: document.querySelector('#record-note').value.trim()
  };
  try {
    const response = await fetch('/api/actions/save_record', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(input)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível salvar.');
    dialog.close();
    await refreshRecords();
    announce('Registro salvo.');
  } catch (error) {
    announce(error.message);
  }
});
document.querySelector('#rows').addEventListener('click', event => {
  const button = event.target.closest('.edit');
  if (!button) return;
  const record = records.find(item => item.id === button.dataset.id);
  if (!record) return;
  document.querySelector('#record-id').value = record.id;
  document.querySelector('#record-name').value = record.name;
  document.querySelector('#record-common').value = record.common || '';
  document.querySelector('#record-status').value = record.status;
  document.querySelector('#record-note').value = record.note || '';
  dialog.showModal();
});
document.querySelector('#export-csv').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = '/api/export.csv';
  link.download = 'app-cartas-acompanhamento.csv';
  link.click();
  announce('Exportação iniciada.');
});
const events = new EventSource('/api/events');
events.addEventListener('open', refresh);
events.addEventListener('change', refresh);
events.addEventListener('error', () => announce('Conexão com o painel interrompida. Tentando reconectar.'));
refresh();
