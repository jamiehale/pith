import * as path from 'node:path';
import * as mustache from 'mustache';
import { loadSourceFile } from './util';
import { Config } from './config';

export function renderTemplate(config: Config, layout: string, view = {}): string {
  const { frontMatter, contents } = loadSourceFile(path.join(config.templatesPath, `${layout}.html`));

  const renderedContent = mustache.render(contents, {
    ...view,
    ...frontMatter,
  });

  if (frontMatter.layout) {
    return renderTemplate(config, frontMatter.layout, {
      ...view,
      ...frontMatter,
      content: renderedContent,
    });
  }

  return renderedContent;
}
