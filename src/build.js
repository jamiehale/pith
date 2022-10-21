#! /usr/bin/env babel-node

import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { buildJournal } from './journal';
import { buildPages } from './pages';

const mkdirp = (path) => {
  fs.mkdirSync(path, { recursive: true });
};

const cleanBuild = (config) => {
  fs.rmSync(config.buildPath, { recursive: true, force: true });
};

const copyStatic = (config) => {
  fs.cpSync(config.staticPath, config.buildPath, {
    recursive: true,
    force: true,
  });
};

const resetBuildFolder = (config) => {
  cleanBuild(config);
  mkdirp(config.buildPath);
};

const buildSite = (config) => {
  resetBuildFolder(config);
  buildJournal(config);
  buildPages(config);
  copyStatic(config);
};

const pithRoot = process.env.PITH_ROOT || '.';
const config = {
  journalPath: path.join(pithRoot, 'journal'),
  templatesPath: path.join(pithRoot, 'templates'),
  staticPath: path.join(pithRoot, 'static'),
  pagesPath: path.join(pithRoot, 'pages'),
  buildPath: path.join(pithRoot, 'build'),
  baseUrl: process.env.PITH_BASE_URL,
  siteTitle: process.env.PITH_SITE_TITLE,
  siteDescription: process.env.PITH_SITE_DESCRIPTION,
  rssItemCount: process.env.PITH_RSS_ITEM_COUNT || 5,
  rssSummaryLength: process.env.PITH_RSS_SUMMARY_LENGTH || 100,
};

try {
  buildSite(config);
} catch (e) {
  console.error(e);
  process.exit(1);
}
