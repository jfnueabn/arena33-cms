require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const venv = path.join(root, '.translation-runtime/venv');
const python = path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || `${command} failed`);
}
try {
  if (!fs.existsSync(python)) run(process.env.TRANSLATION_SETUP_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), ['-m', 'venv', venv]);
  run(python, ['-m', 'pip', 'install', '-r', path.join(__dirname, 'requirements.txt')]);
  run(python, [path.join(__dirname, 'setup_models.py')]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
