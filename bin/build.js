#! /usr/bin/env babel-node

import fs from 'node:fs';
import path from 'node:path';
import * as R from 'ramda';
import { marked } from 'marked';
import mustache from 'mustache';
import moment from 'moment';
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

const createOutputPath = (config, d) =>
  `${config.buildPath}/${d.format('YYYY')}/${d.format('MM')}`;
const createOutputFilename = (config, d) =>
  `${createOutputPath(config, d)}/${d.format('YYYY-MM-DD')}.html`;

const createInputFilename = (config, d) =>
  `${config.journalPath}/${d.format('YYYY')}/${d.format('MM')}/${d.format(
    'YYYY-MM-DD'
  )}.md`;

const mkdirp = (path) => {
  fs.mkdirSync(path, { recursive: true });
};

const dateToHref = (d) =>
  `/${d.format('YYYY')}/${d.format('MM')}/${d.format('YYYY-MM-DD')}.html`;

const toJournalPage = (config, date, older, newer) => (content) => {
  const page = fs
    .readFileSync(path.join(config.templatesPath, 'journal-page.html'))
    .toString();
  return mustache.render(page, {
    title: date.format('dddd, MMMM Do YYYY').toLowerCase(),
    body: content,
    older: older.format('YYYY-DD-MM'),
    olderHref: dateToHref(older),
    newer: newer.format('YYYY-MM-DD'),
    newerHref: dateToHref(newer),
  });
};

const toPage = (config) => (content) => {
  const page = fs
    .readFileSync(path.join(config.templatesPath, 'page.html'))
    .toString();
  return mustache.render(page, {
    body: content,
  });
};

const buildOutput = (config, date, older, newer, filename) =>
  R.compose(
    (content) => {
      mkdirp(createOutputPath(config, date));
      fs.writeFileSync(filename || createOutputFilename(config, date), content);
    },
    toJournalPage(config, date, older, newer),
    (o) => {
      console.log(o);
      return o;
    },
    renderMarkdown,
    (b) => b.toString(),
    fs.readFileSync,
    (inputFilename) => {
      console.log(
        `Processing ${inputFilename} -> ${
          filename || createOutputFilename(config, date)
        }...`
      );
      return inputFilename;
    },
    (date) => createInputFilename(config, date)
  )(date);

const dateDescending = (a, b) => b.valueOf() - a.valueOf();

const getDates = (config) =>
  R.reduce(
    (dates, year) => [
      ...dates,
      ...R.reduce(
        (dates, month) => [
          ...dates,
          ...R.reduce(
            (dates, filename) => [
              ...dates,
              moment(path.basename(filename, '.md')),
            ],
            [],
            allFilesInPath(path.join(config.journalPath, year, month))
          ),
        ],
        [],
        allFilesInPath(path.join(config.journalPath, year))
      ),
    ],
    [],
    allFilesInPath(config.journalPath)
  );

const getSortedDates = (config) => R.sort(dateDescending, getDates(config));

const buildMetadata = (dates) => {
  const metadata = [];
  for (let i = 0; i < R.length(dates); i++) {
    if (i === 0) {
      if (i === R.length(dates) - 1) {
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
      if (i === R.length(dates) - 1) {
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
  const { frontMatter, contents } = loadSourceFile(
    path.join(config.templatesPath, `${layout}.html`)
  );

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
  R.forEach((filename) => {
    console.log(`${config.pagesPath}/${filename}`);
    if (path.extname(filename) === '.html') {
      const { frontMatter, contents } = loadSourceFile(
        path.join(config.pagesPath, filename)
      );

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
      const { frontMatter, contents } = loadSourceFile(
        path.join(config.pagesPath, filename)
      );

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
  }, allFilesInPath(config.pagesPath));
};

const main = async () => {
  const pithRoot = process.env.PITH_ROOT || '.';
  const config = {
    journalPath: path.join(pithRoot, 'journal'),
    templatesPath: path.join(pithRoot, 'templates'),
    staticPath: path.join(pithRoot, 'static'),
    pagesPath: path.join(pithRoot, 'pages'),
    buildPath: path.join(pithRoot, 'build'),
  };

  cleanBuild(config);
  mkdirp(config.buildPath);
  const dates = getSortedDates(config);
  const metadata = buildMetadata(dates);
  R.forEach(
    ({ today, older, newer }) => buildOutput(config, today, older, newer),
    metadata
  );
  if (metadata.length > 0) {
    buildOutput(
      config,
      metadata[0].today,
      metadata[0].older,
      metadata[0].newer,
      path.join(config.buildPath, 'index.html')
    );
  }

  if (fs.existsSync(config.pagesPath)) {
    buildPages(config);
  }
  copyStatic(config);
};

main()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((e) => {
    console.error(`Error: ${e.message}`);
    console.error(e);
    process.exit(1);
  });
