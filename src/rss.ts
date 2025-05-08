import { formatISO } from 'date-fns';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Config } from './config';
import { JournalEntry } from './journal-entry';
import { logFileProcessed } from './log';

const buildItem = (entry: JournalEntry) => `<item>
  <title>${entry.title}</title>
  <link>${entry.link}</link>
  <description>${entry.content}</description>
  <pubDate>${formatISO(entry.date)}</pubDate>
  <guid>${entry.guid}</guid>
</item>
`;

const buildRoot = (config: Config, allEntries: JournalEntry[]) => {
  const items = allEntries.slice(0, config.rssItemCount).map(buildItem).join('\n');

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

export const buildRss = (config: Config, allEntries: JournalEntry[]) => {
  const outputFilePath = path.join(config.buildPath, 'rss.xml');
  const content = buildRoot(config, allEntries);
  logFileProcessed('', outputFilePath);
  fs.writeFileSync(outputFilePath, content);
};
