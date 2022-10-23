import * as fs from 'node:fs';
import * as path from 'node:path';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';
import * as mustache from 'mustache';
import { allFilesInPath, loadSourceFile, mkdirp } from './util';
import { renderMarkdown } from './markdown';
import { renderTemplate } from './templates';
import { buildRss } from './rss';
import { Config } from './config';
import { Metadata } from './metadata';

const createOutputPath = (config: Config, d: Date): string => `${config.buildPath}/${format(d, 'yyyy')}/${format(d, 'MM')}`;

const createOutputFilename = (config: Config, d: Date): string => `${createOutputPath(config, d)}/${format(d, 'yyyy-MM-dd')}.html`;

const createInputFilename = (config: Config, d: Date): string => `${config.journalPath}/${format(d, 'yyyy')}/${format(d, 'MM')}/${format(d, 'yyyy-MM-dd')}.md`;

const journalHref = (d: Date): string => `/${format(d, 'yyyy')}/${format(d, 'MM')}/${format(d, 'yyyy-MM-dd')}.html`;

const buildOutput = (config: Config, metadata: Omit<Metadata, 'title' | 'summary'>, filename: string | undefined = undefined): Metadata => {
  const inputFilePath = createInputFilename(config, metadata.today);
  const outputFilePath = filename || createOutputFilename(config, metadata.today);
  console.log(`${inputFilePath} -> ${outputFilePath}...`);

  const { frontMatter, contents } = loadSourceFile(inputFilePath);

  const renderedMarkdown = renderMarkdown(contents);
  let rendered = mustache.render(renderedMarkdown, frontMatter);
  const summary = rendered
    .replace(/(<([^>]+)>)/gi, '')
    .substring(0, config.rssSummaryLength)
    .concat('...');
  if (frontMatter.layout) {
    rendered = renderTemplate(config, frontMatter.layout, {
      ...frontMatter,
      content: rendered,
      title: frontMatter.title || format(metadata.today, 'EEEE, MMMM do yyyy').toLowerCase(),
      older: format(metadata.older, 'yyyy-MM-dd'),
      olderHref: journalHref(metadata.older),
      newer: format(metadata.newer, 'yyyy-MM-dd'),
      newerHref: journalHref(metadata.newer),
    });
  }

  mkdirp(path.dirname(outputFilePath));
  fs.writeFileSync(outputFilePath, rendered);

  return {
    ...metadata,
    title: frontMatter.title || format(metadata.today, 'EEEE, MMMM do yyyy').toLowerCase(),
    summary: frontMatter.summary || summary,
  };
};

const dateDescending = (a: Date, b: Date) => b.valueOf() - a.valueOf();

const filenamesToDates = (filenames: string[]): Date[] =>
  filenames.reduce<Date[]>((dates, filename) => [...dates, parseISO(path.basename(filename, '.md'))], []);

const monthsToDates = (config: Config, year: string, months: string[]): Date[] =>
  months.reduce<Date[]>((dates, month) => [...dates, ...filenamesToDates(allFilesInPath(path.join(config.journalPath, year, month)))], []);

const yearsToDates = (config: Config, years: string[]): Date[] =>
  years.reduce<Date[]>((dates, year) => [...dates, ...monthsToDates(config, year, allFilesInPath(path.join(config.journalPath, year)))], []);

const getDates = (config: Config): Date[] => yearsToDates(config, allFilesInPath(config.journalPath));

const getSortedDates = (config: Config) => getDates(config).sort(dateDescending);

const buildMetadata = (config: Config, dates: Date[]): Omit<Metadata, 'title' | 'summary'>[] => {
  const metadata = [];
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      if (i === dates.length - 1) {
        metadata.push({
          today: dates[i],
          older: dates[i],
          newer: dates[i],
          link: `${config.baseUrl}${journalHref(dates[i])}`,
        });
      } else {
        metadata.push({
          today: dates[i],
          older: dates[i + 1],
          newer: dates[i], // there is no yesterday
          link: `${config.baseUrl}${journalHref(dates[i])}`,
        });
      }
    } else {
      if (i === dates.length - 1) {
        metadata.push({
          today: dates[i],
          older: dates[i], // there is no tomorrow
          newer: dates[i - 1],
          link: `${config.baseUrl}${journalHref(dates[i])}`,
        });
      } else {
        metadata.push({
          today: dates[i],
          older: dates[i + 1],
          newer: dates[i - 1],
          link: `${config.baseUrl}${journalHref(dates[i])}`,
        });
      }
    }
  }
  return metadata;
};

export const buildJournal = (config: Config) => {
  const dates = getSortedDates(config);
  const partialMetadata = buildMetadata(config, dates);
  const metadata = partialMetadata.map((record) => buildOutput(config, record));
  if (metadata.length > 0) {
    buildOutput(config, metadata[0], path.join(config.buildPath, 'index.html'));
  }
  buildRss(config, metadata);
};
