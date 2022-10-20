import { marked } from 'marked';

export const renderMarkdown = (s) => marked.parse(s);
