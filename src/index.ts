#! /usr/bin/env babel-node

import * as process from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildJournal } from './journal';
import { buildPages } from './pages';
import { mkdirp } from './util';
import { Config } from './config';

const cleanBuild = (config: Config): void => {
  fs.rmSync(config.buildPath, { recursive: true, force: true });
};

const copyStatic = (config: Config): void => {
  fs.cpSync(config.staticPath, config.buildPath, {
    recursive: true,
    force: true,
  });
};

const resetBuildFolder = (config: Config): void => {
  cleanBuild(config);
  mkdirp(config.buildPath);
};

const buildSite = (config: Config): void => {
  resetBuildFolder(config);
  buildJournal(config);
  buildPages(config);
  copyStatic(config);
};

const pithRoot = process.env.PITH_ROOT || '.';
const config: Config = {
  journalPath: path.join(pithRoot, 'journal'),
  templatesPath: path.join(pithRoot, 'templates'),
  staticPath: path.join(pithRoot, 'static'),
  pagesPath: path.join(pithRoot, 'pages'),
  buildPath: path.join(pithRoot, 'build'),
  baseUrl: process.env.PITH_BASE_URL || '',
  siteTitle: process.env.PITH_SITE_TITLE || 'A Pithy Site',
  siteDescription: process.env.PITH_SITE_DESCRIPTION || '',
  rssItemCount: process.env.PITH_RSS_ITEM_COUNT ? parseInt(process.env.PITH_RSS_ITEM_COUNT, 10) : 5,
  rssSummaryLength: process.env.PITH_RSS_SUMMARY_LENGTH ? parseInt(process.env.PITH_RSS_SUMMARY_LENGTH, 10) : 100,
};

try {
  buildSite(config);
} catch (e) {
  console.error(e);
  process.exit(1);
}
