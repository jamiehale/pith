import * as fs from 'node:fs';
import * as path from 'node:path';
import * as mustache from 'mustache';
import { allFilesInPath, loadSourceFile, mkdirp } from './util';
import { renderMarkdown } from './markdown';
import { renderTemplate } from './templates';
import { Config } from './config';
import { logFileProcessed } from './log';

const buildHtmlPage = (config: Config, filename: string) => {
  const inputFilePath = path.join(config.pagesPath, filename);
  const outputFilePath = path.join(config.buildPath, filename);
  logFileProcessed(inputFilePath, outputFilePath);

  const { frontMatter, contents } = loadSourceFile(inputFilePath);

  let rendered = mustache.render(contents, frontMatter);
  if (frontMatter.layout) {
    rendered = renderTemplate(config, frontMatter.layout, {
      ...frontMatter,
      content: rendered,
    });
  }

  mkdirp(path.dirname(outputFilePath));
  fs.writeFileSync(outputFilePath, rendered);
};

const buildMarkdownPage = (config: Config, filename: string) => {
  const inputFilePath = path.join(config.pagesPath, filename);
  const outputFilename = `${path.basename(filename, '.md')}.html`;
  const outputFilePath = path.join(config.buildPath, outputFilename);
  logFileProcessed(inputFilePath, outputFilePath);

  const { frontMatter, contents } = loadSourceFile(inputFilePath);

  const renderedMarkdown = renderMarkdown(contents);
  let rendered = mustache.render(renderedMarkdown, frontMatter);
  if (frontMatter.layout) {
    rendered = renderTemplate(config, frontMatter.layout, {
      ...frontMatter,
      content: rendered,
    });
  }

  mkdirp(path.dirname(outputFilePath));
  fs.writeFileSync(outputFilePath, rendered);
};

export const buildPages = (config: Config) => {
  if (fs.existsSync(config.pagesPath)) {
    allFilesInPath(config.pagesPath).forEach((filename) => {
      if (path.extname(filename) === '.html') {
        buildHtmlPage(config, filename);
      } else if (path.extname(filename) === '.md') {
        buildMarkdownPage(config, filename);
      } else {
        console.error(`Unhandled file type ${filename}`);
      }
    });
  }
};
