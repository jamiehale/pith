import fs from 'node:fs';
import path from 'node:path';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';
import { allFilesInPath, mkdirp } from './util';
import { renderMarkdown } from './markdown';
import { renderTemplate } from './templates';

const createOutputPath = (config, d) => `${config.buildPath}/${format(d, 'yyyy')}/${format(d, 'MM')}`;

const createOutputFilename = (config, d) => `${createOutputPath(config, d)}/${format(d, 'yyyy-MM-dd')}.html`;

const createInputFilename = (config, d) => `${config.journalPath}/${format(d, 'yyyy')}/${format(d, 'MM')}/${format(d, 'yyyy-MM-dd')}.md`;

const journalHref = (d) => `/${format(d, 'yyyy')}/${format(d, 'MM')}/${format(d, 'yyyy-MM-dd')}.html`;

const buildOutput = (config, date, older, newer, filename) => {
  const inputFilename = createInputFilename(config, date);
  console.log(`${inputFilename} -> ${filename || createOutputFilename(config, date)}...`);
  const content = fs.readFileSync(inputFilename).toString();
  const rendered = renderMarkdown(content);
  const journalPage = renderTemplate(config, 'journal-page', {
    title: format(date, 'EEEE, MMMM do yyyy').toLowerCase(),
    body: rendered,
    older: format(older, 'yyyy-MM-dd'),
    olderHref: journalHref(older),
    newer: format(newer, 'yyyy-MM-dd'),
    newerHref: journalHref(newer),
  });
  mkdirp(createOutputPath(config, date));
  fs.writeFileSync(filename || createOutputFilename(config, date), journalPage);
};

const dateDescending = (a, b) => b.valueOf() - a.valueOf();

const getDates = (config) =>
  allFilesInPath(config.journalPath).reduce(
    (dates, year) => [
      ...dates,
      ...allFilesInPath(path.join(config.journalPath, year)).reduce(
        (dates, month) => [
          ...dates,
          ...allFilesInPath(path.join(config.journalPath, year, month)).reduce((dates, filename) => [...dates, parseISO(path.basename(filename, '.md'))], []),
        ],
        []
      ),
    ],
    []
  );

const getSortedDates = (config) => getDates(config).sort(dateDescending);

const buildMetadata = (dates) => {
  const metadata = [];
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      if (i === dates.length - 1) {
        metadata.push({
          today: dates[i],
          older: dates[i],
          newer: dates[i],
        });
      } else {
        metadata.push({
          today: dates[i],
          older: dates[i + 1],
          newer: dates[i], // there is no yesterday
        });
      }
    } else {
      if (i === dates.length - 1) {
        metadata.push({
          today: dates[i],
          older: dates[i], // there is no tomorrow
          newer: dates[i - 1],
        });
      } else {
        metadata.push({
          today: dates[i],
          older: dates[i + 1],
          newer: dates[i - 1],
        });
      }
    }
  }
  return metadata;
};

export const buildJournal = (config) => {
  const dates = getSortedDates(config);
  const metadata = buildMetadata(dates);
  for (const { today, older, newer } of metadata) {
    buildOutput(config, today, older, newer);
  }
  if (metadata.length > 0) {
    buildOutput(config, metadata[0].today, metadata[0].older, metadata[0].newer, path.join(config.buildPath, 'index.html'));
  }
};
