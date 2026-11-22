import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CanvasError, createCanvas, joinSession } from '@github/copilot-sdk/extension';
import declaration from './extension.json' with { type: 'json' };
import { loadState, saveState } from './storage.mjs';
import { pageHtml } from './page.mjs';

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(extensionDir, '..', '..', '..');
const instances = new Map();

function notifyChanges() {
  for (const { clients } of instances.values()) {
    for (const client of clients) client.write('event: change\ndata: {}\n\n');
  }
}

function text(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function validateRecord(input) {
  const name = text(input?.name, 160);
  if (!name) throw new CanvasError('invalid_input', 'Informe o nome do candidato.');
  if (!['pending', 'received', 'late'].includes(input.status)) {
    throw new CanvasError('invalid_input', 'Situação inválida.');
  }
  const id = text(input.id, 36);
  if (id && !/^[a-f0-9-]{36}$/i.test(id)) {
    throw new CanvasError('invalid_input', 'Identificador inválido.');
  }
  return {
    id: id || crypto.randomUUID(),
    name,
    common: text(input.common, 160),
    status: input.status,
    note: text(input.note, 500)
  };
}

function csvCell(value) {
  const textValue = String(value ?? '');
  return `"${textValue.replaceAll('"', '""')}"`;
}

async function createServer(instanceId, label) {
  const existing = instances.get(instanceId);
  if (existing?.server) return existing.url;

  let state = await loadState(projectRoot);
  const clientSource = await fs.readFile(path.join(extensionDir, 'client.js'), 'utf8');
  const html = pageHtml(state, label).replace('/*__CLIENT_SCRIPT__*/', clientSource);
  const clients = new Set();

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      if (url.pathname === '/' && request.method === 'GET') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
        return;
      }
      if (url.pathname === '/api/state' && request.method === 'GET') {
        state = await loadState(projectRoot);
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify({ ok: true, records: state.records }));
        return;
      }
      if (url.pathname === '/api/events' && request.method === 'GET') {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store',
          'Connection': 'keep-alive'
        });
        response.write(': connected\n\n');
        clients.add(response);
        response.on('close', () => clients.delete(response));
        return;
      }
      if (url.pathname === '/api/export.csv' && request.method === 'GET') {
        state = await loadState(projectRoot);
        const labels = { pending: 'Pendente', received: 'Entregue', late: 'Em atraso' };
        const lines = [
          ['Candidato', 'Comum', 'Situação', 'Observação'].map(csvCell).join(','),
          ...state.records.map(record => [record.name, record.common, labels[record.status], record.note].map(csvCell).join(','))
        ];
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        response.setHeader('Content-Disposition', 'attachment; filename="app-cartas-acompanhamento.csv"');
        response.end(`\uFEFF${lines.join('\r\n')}`);
        return;
      }
      if (url.pathname === '/api/actions/save_record' && request.method === 'POST') {
        let body = '';
        for await (const chunk of request) body += chunk;
        if (Buffer.byteLength(body) > 10000) throw new CanvasError('invalid_input', 'Dados excedem o limite permitido.');
        let input;
        try { input = JSON.parse(body); } catch { throw new CanvasError('invalid_input', 'JSON inválido.'); }
        const record = validateRecord(input);
        state = await loadState(projectRoot);
        const records = [...state.records];
        const index = records.findIndex(item => item.id === record.id);
        if (index >= 0) records[index] = record; else records.push(record);
        state = await saveState(projectRoot, records);
        notifyChanges();
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ ok: true, records: state.records }));
        return;
      }
      response.statusCode = 404;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: 'Recurso não encontrado.' }));
    } catch (error) {
      const status = error instanceof CanvasError ? 400 : 500;
      response.statusCode = status;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: error instanceof CanvasError ? error.message : 'Não foi possível concluir.' }));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new CanvasError('storage_error', 'Não foi possível iniciar o painel.');
  const url = `http://127.0.0.1:${address.port}/`;
  instances.set(instanceId, { server, url, clients });
  return url;
}

const actionHandlers = {
  save_record: async ({ input }) => {
    const record = validateRecord(input);
    const state = await loadState(projectRoot);
    const records = [...state.records];
    const index = records.findIndex(item => item.id === record.id);
    if (index >= 0) records[index] = record; else records.push(record);
    const saved = await saveState(projectRoot, records);
    notifyChanges();
    return { ok: true, records: saved.records };
  },
  export_csv: async () => {
    const state = await loadState(projectRoot);
    const labels = { pending: 'Pendente', received: 'Entregue', late: 'Em atraso' };
    const lines = [['Candidato','Comum','Situação','Observação'].map(csvCell).join(','),
      ...state.records.map(record => [record.name,record.common,labels[record.status],record.note].map(csvCell).join(','))];
    return { format: 'csv', filename: 'app-cartas-acompanhamento.csv', content: `\uFEFF${lines.join('\r\n')}` };
  }
};

const session = await joinSession({
  canvases: declaration.canvases.map(canvas => createCanvas({
    ...canvas,
    ...(canvas.actions ? { actions: canvas.actions.map(action => ({
      ...action,
      handler: actionHandlers[action.name]
    })) } : {}),
    open: async ({ instanceId, input }) => {
      try {
        const url = await createServer(instanceId, text(input?.label, 160));
        return { url };
      } catch (error) {
        throw new CanvasError(error instanceof CanvasError ? error.code : 'storage_error',
          error instanceof CanvasError ? error.message : 'Não foi possível abrir o painel.');
      }
    },
    onClose: async ({ instanceId }) => {
      const live = instances.get(instanceId);
      if (live?.server) {
        for (const client of live.clients) client.end();
        await new Promise(resolve => live.server.close(resolve));
        instances.delete(instanceId);
      }
    }
  }))
});
