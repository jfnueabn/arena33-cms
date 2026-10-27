const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const root = path.join(__dirname, '..', '..');
const modelDirectory = path.resolve(root, process.env.TRANSLATION_MODEL_DIR || '.translation-runtime/models');
const python = process.env.TRANSLATION_PYTHON || path.join(root, '.translation-runtime', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
let worker, sequence = 0;
const pending = new Map();

function available() {
  return fs.existsSync(python) && ['ms','zh'].every(locale => fs.existsSync(path.join(modelDirectory, 'en-' + locale, 'model', 'model.bin')));
}

function start() {
  if (worker) return;
  if (!available()) throw new Error('Offline translation models are not installed. Run the translation setup.');
  worker = spawn(python, [path.join(__dirname, '..', 'translation', 'worker.py')], {
    cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, TRANSLATION_MODEL_DIR: modelDirectory, PYTHONIOENCODING: 'utf-8', HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' }
  });
  const processHandle = worker;
  const fail = () => {
    if (worker !== processHandle) return;
    worker = null;
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('The local translation worker stopped.')); }
    pending.clear();
  };
  worker.on('error', fail);
  worker.stdin.on('error', fail);
  worker.on('exit', fail);
  worker.stderr.on('data', () => {});
  readline.createInterface({ input: worker.stdout }).on('line', line => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id); clearTimeout(item.timer);
    if (message.error) item.reject(new Error(message.error)); else item.resolve(message.translations);
  });
}

async function translateBatch(texts, locale) {
  start();
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id); reject(new Error('Local translation timed out. English was saved; translation will be retried on the next save.'));
      worker?.kill();
    }, 180000);
    pending.set(id, { resolve, reject, timer });
    worker.stdin.write(JSON.stringify({ id, locale, texts }) + '\n');
  });
}
function stop() {
  const previous = worker; worker = null; previous?.kill();
  for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('Local translation stopped.')); }
  pending.clear();
}
module.exports = { available, translateBatch, stop };
