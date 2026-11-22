'use strict';

async function audit(store, req, actor, action, details) {
  const body = {
    user_id: actor?.id || null,
    action,
    module: 'CARTAS',
    details: {
      schema_version: 2,
      source: 'APP_CARTAS',
      actor: { user_id: actor?.id || null, name: actor?.name || 'Emissão pública sem login' },
      request: { method: req.method, path: new URL(req.url, 'http://internal').pathname },
      ...details
    },
    ip_address: req.socket?.remoteAddress || null,
    user_agent: String(req.headers['user-agent'] || '').slice(0, 1000)
  };
  await store.api('/rest/v1/audit_logs', { method: 'POST', body, extra: { Prefer: 'return=minimal' } });
}

module.exports = { audit };
