import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const FORMAT = 'app-cartas-dashboard';
const VERSION = 1;

export function statePath(workspaceRoot) {
  return path.join(workspaceRoot, 'data', 'app-cartas-dashboard-state.json');
}

async function readJson(file) {
  const text = await fs.readFile(file, 'utf8');
  const value = JSON.parse(text);
  if (!value || value.format !== FORMAT || value.version !== VERSION || !Array.isArray(value.records)) {
    throw new Error('Formato ou versão de dados não reconhecidos.');
  }
  return value;
}

export async function loadState(workspaceRoot) {
  const file = statePath(workspaceRoot);
  try {
    return await readJson(file);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { format: FORMAT, version: VERSION, records: [], updatedAt: null };
    }
    throw error;
  }
}

export async function saveState(workspaceRoot, records) {
  const file = statePath(workspaceRoot);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const value = {
    format: FORMAT,
    version: VERSION,
    records,
    updatedAt: new Date().toISOString()
  };
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temporary, file);
  return value;
}
