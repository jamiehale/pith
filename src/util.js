import fs from 'node:fs';
import { parseAllDocuments } from 'yaml';

const frontMatterPattern = /^---.*---\s*/s;

export const loadSourceFile = (filePath) => {
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

export const allFilesInPath = (path) => fs.readdirSync(path);

export const mkdirp = (path) => {
  fs.mkdirSync(path, { recursive: true });
};
