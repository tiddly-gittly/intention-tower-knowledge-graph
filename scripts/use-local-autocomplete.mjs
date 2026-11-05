import { log } from 'node:console';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = resolve(process.argv[2] ?? resolve(root, '../tw-command-palette'));
const artifact = resolve(upstream, 'dist/library/recipes/library/tiddlers/%24%3A%2Fplugins%2Flinonetwo%2Fautocomplete.json');
const destination = resolve(root, 'wiki/tiddlers/system/$__plugins_linonetwo_autocomplete.json');
writeFileSync(destination, `${JSON.stringify([JSON.parse(readFileSync(artifact, 'utf8'))], null, 4)}\n`);
log(`Demo autocomplete loaded from ${artifact}`);
