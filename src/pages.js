import fs from 'node:fs';
import path from 'node:path';
import mustache from 'mustache';
import { allFilesInPath, loadSourceFile, mkdirp } from './util';
import { renderMarkdown } from './markdown';
import { renderTemplate } from './templates';

export const buildPages = (config) => {
  if (fs.existsSync(config.pagesPath)) {
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
  }
};
