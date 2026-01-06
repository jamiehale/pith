import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseAllDocuments } from 'yaml';
import { LoadedFile } from './types';

const frontMatterPattern = /^---.*---\s*/s;

export const loadSourceFile = (filePath: string): LoadedFile => {
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

export function loadSourceFilesRecursively(folderPath: string): { frontMatter: Record<string, any>, contents: string }[] {
  return allFilesInPath(folderPath).reduce<LoadedFile[]>((loadedFiles, filename) => {
    const filePath = path.join(folderPath, filename);
    if (fs.statSync(filePath).isDirectory()) {
      return [...loadedFiles, ...loadSourceFilesRecursively(filePath)];
    }
    return [...loadedFiles, loadSourceFile(filePath)];
  }, []);
}

export const allFilesInPath = (path: string) => fs.readdirSync(path);

export const mkdirp = (path: string) => {
  fs.mkdirSync(path, { recursive: true });
};
