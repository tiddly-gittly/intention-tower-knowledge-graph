/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import path from 'path';
import fs from 'fs-extra';
import tw from 'tiddlywiki';
import { walkFilesAsync } from './utils.mjs';

const SOURCE_DIRECTORY = 'src';
const DISTNATION_DIRECTORY = 'dist';
const WIKI_DIRECTORY = 'demo';
const WIKI_TIDDLERS_DIRECTORY = `${WIKI_DIRECTORY}/tiddlers`;
const DIST_WIKI_TIDDLERS_DIRECTORY = `${DISTNATION_DIRECTORY}/tiddlers`;
const ENTRANCE_EXT_LIST = new Set(['.ts', '.tsx', '.jsx', '.mjs']);
const pluginInfo = fs.readJsonSync('src/plugin.info');
const [_, __, author, name] = pluginInfo.title.split('/');
const pluginTitle = `${author}/${name}`;
const DIST_PLUGIN_DIRECTORY = path.join(DISTNATION_DIRECTORY, `${pluginInfo["plugin-type"]}s`, pluginTitle);

export const cleanDist = async () => {
  const distJsTiddler = /^.*\.js\.dist\.tid$/;
  await walkFilesAsync(DISTNATION_DIRECTORY, (dir) => {
    if (distJsTiddler.test(dir)) fs.rmSync(dir);
  });
  const distPluginTiddler = /^.*\.json\.dist\.json$/;
  await walkFilesAsync(WIKI_TIDDLERS_DIRECTORY, (dir) => {
    if (distPluginTiddler.test(dir)) fs.rmSync(dir);
  });
  fs.rmSync('dist', { recursive: true, force: true });
};

export const initTiddlyWiki = async (_$tw, arguments_) => {
  // copy demo
  await fs.copy(path.join(process.cwd(), 'demo'), DISTNATION_DIRECTORY);
  const $tw = tw.TiddlyWiki(_$tw);
  $tw.boot.argv = arguments_ || [DISTNATION_DIRECTORY];
  $tw.boot.boot();
  return $tw;
};

const excludeFiles = /^.*\.(tsx?|jsx|meta|swp|mjs)$|^\.(git|hg|lock-wscript|svn|DS_Store|(wafpickle-|_).*)$|^CVS$|^npm-debug\.log$/;

export const exportPlugins = ($tw, minify, exportToDistribution, exportToWiki) => {
  // Ignore ts, tsx, jsm and jsx
  if (exportToDistribution) {
    fs.mkdirsSync(DISTNATION_DIRECTORY);
    const directory = DIST_PLUGIN_DIRECTORY;
    const directoryStat = fs.statSync(directory);
    if (!directoryStat.isDirectory()) return;
  }
  const pluginInfo = $tw.loadPluginFolder(SOURCE_DIRECTORY, excludeFiles);
  const pluginTiddlerName = `${path.basename($tw.utils.generateTiddlerFilepath(pluginInfo.title, {}))}.json`;
  if (exportToWiki) fs.writeJSONSync(path.join(DIST_WIKI_TIDDLERS_DIRECTORY, `${pluginTiddlerName}.dist.json`), pluginInfo);
  if (exportToDistribution) fs.writeJSONSync(path.join('dist', 'tiddlers', pluginTiddlerName), pluginInfo);
};
