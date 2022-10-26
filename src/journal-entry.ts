export interface JournalEntry {
  date: Date;
  title: string;
  content: string;
  sourcePath: string;
  frontMatter: Record<string, any>;
  link: string;
  guid: string;
}
