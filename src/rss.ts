import * as fs from 'node:fs';
import * as path from 'node:path';
import { Config } from './config';
import { Metadata } from './metadata';

const buildItem = (metadata: Metadata) => `<item>
  <title>${metadata.title}</title>
  <link>${metadata.link}</link>
  <description>${metadata.summary}</description>
</item>
`;

const buildRoot = (config: Config, metadata: Metadata[]) => {
  const items = metadata.slice(0, config.rssItemCount).map(buildItem).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  
<channel>
  <title>${config.siteTitle}</title>
  <link>${config.baseUrl}</link>
  <description>${config.siteDescription}</description>
  ${items}
</channel>

</rss>
`;
};

export const buildRss = (config: Config, metadata: Metadata[]) => {
  const outputFilePath = path.join(config.buildPath, 'rss.xml');
  const content = buildRoot(config, metadata);
  fs.writeFileSync(outputFilePath, content);
};
