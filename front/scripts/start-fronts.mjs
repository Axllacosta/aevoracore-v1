import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const internal = fileURLToPath(new URL('../', import.meta.url));
const ecommerce = fileURLToPath(new URL('../../ecommerce-front/', import.meta.url));
const definitions = [
  { name: 'Sistema interno', root: internal, port: '4201' },
  { name: 'Ecommerce', root: ecommerce, port: '4200' },
];
for (const app of definitions) {
  if (!existsSync(join(app.root, 'node_modules/@angular/cli/bin/ng.js')))
    throw new Error(`Faltan dependencias en ${app.root}. Ejecuta npm ci en esa carpeta.`);
}
const children = definitions.map((app) => {
  console.log(`${app.name}: http://localhost:${app.port}`);
  return spawn(
    process.execPath,
    [join(app.root, 'node_modules/@angular/cli/bin/ng.js'), 'serve', '--port', app.port],
    { cwd: app.root, stdio: 'inherit', windowsHide: true },
  );
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
