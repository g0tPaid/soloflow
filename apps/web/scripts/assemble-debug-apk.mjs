import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(webRoot, 'android');
const win = process.platform === 'win32';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: win });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('cap', ['sync', 'android'], webRoot);
run(win ? 'gradlew.bat' : './gradlew', ['assembleDebug'], androidDir);

const releaseDir = path.join(webRoot, 'release');
mkdirSync(releaseDir, { recursive: true });
const apk = path.join(releaseDir, 'SoloFlow-debug.apk');
copyFileSync(path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk'), apk);
console.log(apk);
