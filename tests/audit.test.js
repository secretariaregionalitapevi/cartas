'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { audit } = require('../src/audit');
const { AdminAuth } = require('../src/admin-auth');

test('public audit has no invented user and identifies the application', async () => {
  let event;
  const store = { api: async (route, options) => { assert.equal(route, '/rest/v1/audit_logs'); event = options.body; } };
  await audit(store, { method: 'POST', url: '/api/letters', headers: {}, socket: {} }, null, 'CREATE', { entity: 'cartas_emissoes', entity_id: 'test' });
  assert.equal(event.user_id, null);
  assert.equal(event.details.actor.name, 'Emissão pública sem login');
  assert.equal(event.details.source, 'APP_CARTAS');
});

test('admin login checks approved profile and audits before issuing the cookie', async () => {
  const events = [];
  const store = {
    key: 'test-key',
    user: async () => ({ id: 'verified-user', email: 'a@example.test' }),
    rows: async () => [{ status: 'approved', role_id: 3, sector: 'Música', municipio: 'Itapevi', full_name: 'Pessoa real' }],
    api: async (route, options) => { events.push(options.body); }
  };
  const auth = new AdminAuth(store, {});
  auth.token = async () => ({ access_token: 'test', refresh_token: 'refresh', expires_in: 3600 });
  const req = { method: 'POST', url: '/api/admin/login', headers: { host: 'cartas.test', origin: 'https://cartas.test', 'content-type': 'application/json' }, socket: {} };
  let cookie;
  const res = { setHeader: (name, value) => { cookie = value; } };
  await auth.login(req, res, { email: 'a@example.test', password: 'test', user_id: 'forged' });
  assert.equal(events[0].user_id, 'verified-user');
  assert.equal(events[0].details.actor.name, 'Pessoa real');
  assert.match(cookie, /cartas_admin_session=/);
  cookie = null;
  store.api = async () => { throw Error('unavailable'); };
  await assert.rejects(auth.login(req, res, { email: 'a@example.test', password: 'test' }), /registrar o acesso/);
  assert.equal(cookie, null);
});
