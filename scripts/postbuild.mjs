import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');
const sourceFile = resolve(projectRoot, 'script.js');
const targetDir = resolve(projectRoot, 'dist');
const targetFile = resolve(targetDir, 'script.js');

await mkdir(targetDir, { recursive: true });
await copyFile(sourceFile, targetFile);
