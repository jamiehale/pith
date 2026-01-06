export interface LoadedFile {
  frontMatter: Record<string, any>;
  contents: string;
}

export interface Post {
  date: Date;
  title: string;
  content: string;
  sourcePath: string;
  frontMatter: Record<string, any>;
  link: string;
  guid: string;
}
