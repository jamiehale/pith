import { marked } from 'marked';

export const renderMarkdown = (s: string) => marked.parse(s);
