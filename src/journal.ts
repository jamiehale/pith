import * as fs from 'node:fs';
import * as path from 'node:path';
import { format, formatISO } from 'date-fns';
import { allFilesInPath, loadSourceFile, mkdirp } from './util';
import { renderMarkdown } from './markdown';
import { renderTemplate } from './templates';
import { buildRss } from './rss';
import { Config } from './config';
import { JournalEntry } from './journal-entry';
import { logFileProcessed } from './log';

const journalHref = (date: Date, title?: string): string => `/${format(date, 'yyyy')}/${format(date, 'MM')}/${buildOutputFilename(date, title)}`;

const journalEntryHref = (entry: JournalEntry): string => journalHref(entry.date, entry.title);

const renderMarkdownHere = (config: Config, filePath: string): JournalEntry => {
  const { frontMatter, contents } = loadSourceFile(filePath);
  const renderedMarkdown = renderMarkdown(contents);
  if (frontMatter.date) {
    return {
      date: new Date(frontMatter.date),
      title: frontMatter.title,
      content: renderedMarkdown,
      sourcePath: filePath,
      frontMatter,
      link: `${config.baseUrl}${journalHref(new Date(frontMatter.date), frontMatter.title)}`,
      guid: frontMatter.guid || `${config.baseUrl}${journalHref(new Date(frontMatter.date), frontMatter.title)}`,
    };
  }
  throw new Error('No journal entry date found in front matter');
};

const renderHtmlHere = (config: Config, filePath: string): JournalEntry => {
  const { frontMatter, contents } = loadSourceFile(filePath);
  if (frontMatter.date) {
    return {
      date: new Date(frontMatter.date),
      title: frontMatter.title,
      content: contents,
      sourcePath: filePath,
      frontMatter,
      link: `${config.baseUrl}${journalHref(new Date(frontMatter.date), frontMatter.title)}`,
      guid: frontMatter.guid || `${config.baseUrl}${journalHref(new Date(frontMatter.date), frontMatter.title)}`,
    };
  }
  throw new Error('No journal entry date found in front matter');
};

function loadFromFolder(config: Config, folderPath: string): JournalEntry[] {
  return allFilesInPath(folderPath).reduce<JournalEntry[]>((entries, filename) => {
    const filePath = path.join(folderPath, filename);
    if (fs.statSync(filePath).isDirectory()) {
      return [...entries, ...loadFromFolder(config, filePath)];
    }
    if (path.extname(filePath) === '.md') {
      return [
        ...entries,
        renderMarkdownHere(config, filePath),
      ];
    }
    if (path.extname(filePath) === '.html') {
      return [
        ...entries,
        renderHtmlHere(config, filePath),
      ];
    }
    return entries;
  }, []);
}

const loadAllEntries = (config: Config): JournalEntry[] => loadFromFolder(config, config.journalPath);

const buildOutputFilename = (date: Date, title?: string): string => {
  const dateString = `${format(date, 'yyyy')}-${format(date, 'MM')}-${format(date, 'dd')}`;
  if (title) {
    const santizedTitle = title.split(' ').join('-');
    return `${dateString}-${santizedTitle}.html`;
  }
  return `${dateString}.html`;
};

const buildOutputFilePath = (config: Config, entry: JournalEntry): string =>
  path.join(config.buildPath, format(entry.date, 'yyyy'), format(entry.date, 'MM'), buildOutputFilename(entry.date, entry.title));

const entryDateDescending = (a: JournalEntry, b: JournalEntry) => b.date.valueOf() - a.date.valueOf();

interface NavMapEntry {
  older?: string;
  newer?: string;
  link: string;
}

type NavMap = { [date: string]: NavMapEntry };

const dateToNavMapKey = (date: Date): string => formatISO(date);

const buildNavMap = (config: Config, entries: JournalEntry[]): NavMap => {
  const navMap: NavMap = {};
  for (let i = 0; i < entries.length; i++) {
    const date = dateToNavMapKey(entries[i].date);
    if (i === 0) {
      if (i === entries.length - 1) {
        navMap[date] = {
          link: `${config.baseUrl}${journalEntryHref(entries[i])}`,
        };
      } else {
        navMap[date] = {
          older: journalEntryHref(entries[i + 1]),
          link: `${config.baseUrl}${journalEntryHref(entries[i])}`,
        };
      }
    } else {
      if (i === entries.length - 1) {
        navMap[date] = {
          newer: journalEntryHref(entries[i - 1]),
          link: `${config.baseUrl}${journalEntryHref(entries[i])}`,
        };
      } else {
        navMap[date] = {
          older: journalEntryHref(entries[i + 1]),
          newer: journalEntryHref(entries[i - 1]),
          link: `${config.baseUrl}${journalEntryHref(entries[i])}`,
        };
      }
    }
  }
  return navMap;
};

export const buildJournal = (config: Config) => {
  const allEntries = loadAllEntries(config).sort(entryDateDescending);
  const navMap = buildNavMap(config, allEntries);
  for (let i = 0; i < allEntries.length; i++) {
    const entry = allEntries[i];
    const outputFilePath = buildOutputFilePath(config, entry);
    let content = entry.content;
    if (entry.frontMatter.layout) {
      const date = dateToNavMapKey(entry.date);
      content = renderTemplate(config, entry.frontMatter.layout, {
        ...entry.frontMatter,
        olderHref: navMap[date].older,
        newerHref: navMap[date].newer,
      });
    }
    logFileProcessed(entry.sourcePath, outputFilePath);
    mkdirp(path.dirname(outputFilePath));
    fs.writeFileSync(outputFilePath, content);

    if (i === 0) {
      const indexFilePath = path.join(config.buildPath, 'index.html');
      logFileProcessed(entry.sourcePath, indexFilePath);
      fs.writeFileSync(indexFilePath, content);
    }
  }
  buildRss(config, allEntries);
};
