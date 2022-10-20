import path from 'node:path';
import mustache from 'mustache';
import { loadSourceFile } from './util';

export function renderTemplate(config, layout, view = {}) {
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
}
