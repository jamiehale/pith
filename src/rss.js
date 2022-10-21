import format from 'date-fns/format';
import fs from 'node:fs';
import path from 'node:path';

const buildItem = (metadata) => `<item>
  <title>${format(metadata.today, 'EEEE, MMMM do yyyy')}</title>
  <link>${metadata.link}</link>
  <description></description>
</item>
`;

const buildRoot = (config, metadata) => {
  const items = metadata.slice(0, 5).map(buildItem).join('\n');

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

export const buildRss = (config, metadata) => {
  const outputFilePath = path.join(config.buildPath, 'rss.xml');
  const content = buildRoot(config, metadata);
  fs.writeFileSync(outputFilePath, content);
};
