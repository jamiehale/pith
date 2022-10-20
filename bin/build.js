#! /usr/bin/env babel-node

import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import mustache from 'mustache';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';
import { parseAllDocuments } from 'yaml';

const frontMatterPattern = /^---.*---\s*/s;

const loadSourceFile = (filePath) => {
  const contents = fs.readFileSync(filePath).toString();
  const matches = contents.match(frontMatterPattern);
  if (!matches) {
    return {
      frontMatter: {},
      contents,
    };
  }
  return {
    frontMatter: parseAllDocuments(matches[0])[0].toJS(),
    contents: contents.substring(matches[0].length),
  };
};

const renderMarkdown = (s) => marked.parse(s);

const createOutputPath = (config, d) => `${config.buildPath}/${format(d, 'yyyy')}/${format(d, 'MM')}`;

const createOutputFilename = (config, d) => `${createOutputPath(config, d)}/${format(d, 'yyyy-MM-dd')}.html`;

const createInputFilename = (config, d) => `${config.journalPath}/${format(d, 'yyyy')}/${format(d, 'MM')}/${format(d, 'yyyy-MM-dd')}.md`;

const mkdirp = (path) => {
  fs.mkdirSync(path, { recursive: true });
};

const journalHref = (d) => `/${format(d, 'yyyy')}/${format(d, 'MM')}/${format(d, 'yyyy-MM-dd')}.html`;

const toJournalPage = (config, date, older, newer) => (content) => {
  const page = fs.readFileSync(path.join(config.templatesPath, 'journal-page.html')).toString();
  return mustache.render(page, {
    title: format(date, 'EEEE, MMMM do yyyy').toLowerCase(),
    body: content,
    older: format(older, 'yyyy-MM-dd'),
    olderHref: journalHref(older),
    newer: format(newer, 'yyyy-MM-dd'),
    newerHref: journalHref(newer),
  });
};

const buildOutput = (config, date, older, newer, filename) => {
  const inputFilename = createInputFilename(config, date);
  console.log(`Processing ${inputFilename} -> ${filename || createOutputFilename(config, date)}...`);
  const content = fs.readFileSync(inputFilename).toString();
  const rendered = renderMarkdown(content);
  const journalPage = toJournalPage(config, date, older, newer)(rendered);
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

const cleanBuild = (config) => {
  fs.rmSync(config.buildPath, { recursive: true, force: true });
};

const copyStatic = (config) => {
  fs.cpSync(config.staticPath, config.buildPath, {
    recursive: true,
    force: true,
  });
};

const allFilesInPath = (path) => fs.readdirSync(path);

const renderTemplate = (config, layout, view = {}) => {
  const { frontMatter, contents } = loadSourceFile(path.join(config.templatesPath, `${layout}.html`));

  const renderedContent = mustache.render(contents, {
    ...view,
    ...frontMatter,
  });

  if (frontMatter.layout) {
    return renderTemplate(config, frontMatter.layout, {
      content: renderedContent,
    });
  }

  return renderedContent;
};

const buildPages = (config) => {
  allFilesInPath(config.pagesPath).forEach((filename) => {
    console.log(`${config.pagesPath}/${filename}`);
    if (path.extname(filename) === '.html') {
      const { frontMatter, contents } = loadSourceFile(path.join(config.pagesPath, filename));

      let rendered = mustache.render(contents, frontMatter);
      if (frontMatter.layout) {
        rendered = renderTemplate(config, frontMatter.layout, {
          ...frontMatter,
          content: rendered,
        });
      }

      const outputFilePath = path.join(config.buildPath, filename);
      mkdirp(path.dirname(outputFilePath));
      fs.writeFileSync(outputFilePath, rendered);
    } else if (path.extname(filename) === '.md') {
      const { frontMatter, contents } = loadSourceFile(path.join(config.pagesPath, filename));

      const renderedMarkdown = renderMarkdown(contents);
      let rendered = mustache.render(renderedMarkdown, frontMatter);
      if (frontMatter.layout) {
        rendered = renderTemplate(config, frontMatter.layout, {
          ...frontMatter,
          content: rendered,
        });
      }

      const outputFilename = `${path.basename(filename, '.md')}.html`;
      const outputFilePath = path.join(config.buildPath, outputFilename);
      mkdirp(path.dirname(outputFilePath));
      fs.writeFileSync(outputFilePath, rendered);
    } else {
      console.error(`Unhandled file type ${filename}`);
    }
  });
};

const resetBuildFolder = (config) => {
  cleanBuild(config);
  mkdirp(config.buildPath);
};

const buildJournal = (config) => {
  const dates = getSortedDates(config);
  const metadata = buildMetadata(dates);
  for (const { today, older, newer } of metadata) {
    buildOutput(config, today, older, newer);
  }
  if (metadata.length > 0) {
    buildOutput(config, metadata[0].today, metadata[0].older, metadata[0].newer, path.join(config.buildPath, 'index.html'));
  }
};

const main = () => {
  const pithRoot = process.env.PITH_ROOT || '.';
  const config = {
    journalPath: path.join(pithRoot, 'journal'),
    templatesPath: path.join(pithRoot, 'templates'),
    staticPath: path.join(pithRoot, 'static'),
    pagesPath: path.join(pithRoot, 'pages'),
    buildPath: path.join(pithRoot, 'build'),
  };

  resetBuildFolder(config);
  buildJournal(config);

  if (fs.existsSync(config.pagesPath)) {
    buildPages(config);
  }
  copyStatic(config);
};

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
