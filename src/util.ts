import * as fs from 'node:fs';
import { parseAllDocuments } from 'yaml';

const frontMatterPattern = /^---.*---\s*/s;

export const loadSourceFile = (filePath: string) => {
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

export const allFilesInPath = (path: string) => fs.readdirSync(path);

export const mkdirp = (path: string) => {
  fs.mkdirSync(path, { recursive: true });
};
