#! /usr/bin/env babel-node

import * as process from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildJournal } from './journal';
import { buildPages } from './pages';
import { allFilesInPath, loadSourceFile, loadSourceFilesRecursively, mkdirp } from './util';
import { Config } from './config';
import { LoadedFile, Post } from './types';

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

interface AllFiles {
  allPosts: Post[];
  postsById: Record<string, Post>;
}

const loadAllPosts = (config: Config) => {
  allFilesInPath(config.journalPath).forEach((filename) => {
    const { frontMatter, contents } = loadSourceFile(filename);
  });
};

const loadAllFiles = (config: Config): LoadedFile[] => {
  return loadSourceFilesRecursively(config.sourcePath);
};

const buildSite = (config: Config): void => {
  resetBuildFolder(config);
  const allFiles = loadAllFiles(config);
  const db = {
    allFiles,
    postsById: allFiles.reduce<Record<string, LoadedFile>>((acc, file) => (file.frontMatter.id ? { ...acc, [file.frontMatter.id]: file } : acc), {})
  }
  buildJournal(config);
  buildPages(config);
  copyStatic(config);
};

const pithRoot = process.env.PITH_ROOT || '.';
const config: Config = {
  sourcePath: pithRoot,
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
