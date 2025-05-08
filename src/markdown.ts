import { marked } from 'marked';

export const renderMarkdown = (s: string): string => marked.parse(s, { async: false });
