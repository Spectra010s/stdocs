/**
 * Markdown Processor
 * 
 * Converts Markdown files to HTML with frontmatter extraction
 * and syntax highlighting.
 */

import matter from 'gray-matter';
import { marked } from 'marked';
import hljs from 'highlight.js';
import slugifyDefault from 'slugify';

// Handle ESM/CJS interop
const slugifyFn: (str: string, opts?: { lower?: boolean; strict?: boolean }) => string = 
  (slugifyDefault as any).default || slugifyDefault;

export interface MarkdownResult {
  /** Rendered HTML content */
  html: string;
  /** Frontmatter data */
  frontmatter: Record<string, unknown>;
  /** Raw markdown content (without frontmatter) */
  rawContent: string;
  /** Extracted headings for TOC */
  headings: Heading[];
  /** Title from frontmatter or first h1 */
  title: string;
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * Configure marked with syntax highlighting
 */
function configureMarked(): void {
  marked.setOptions({
    gfm: true,
    breaks: false,
  });
}

/**
 * Create a slug from text
 */
export function slug(text: string): string {
  return slugifyFn(text, { lower: true, strict: true });
}

/**
 * Process a markdown string and return structured result
 */
export function processMarkdown(source: string): MarkdownResult {
  configureMarked();

  // Extract frontmatter
  const { content, data: frontmatter } = matter(source);

  // Track headings for TOC
  const headings: Heading[] = [];

  // Custom renderer for headings and code blocks
  const renderer = new marked.Renderer();

  renderer.heading = function (text: string, level: number): string {
    const id = slug(text);
    if (level <= 3) {
      headings.push({ level, text, id });
    }
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  renderer.code = function (code: string, language?: string): string {
    if (language && hljs.getLanguage(language)) {
      const highlighted = hljs.highlight(code, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    }
    const highlighted = hljs.highlightAuto(code).value;
    return `<pre><code class="hljs">${highlighted}</code></pre>`;
  };

  // Parse markdown
  const html = marked.parse(content, { renderer }) as string;

  // Extract title
  let title = '';
  if (frontmatter.title && typeof frontmatter.title === 'string') {
    title = frontmatter.title;
  } else {
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
      title = match[1].trim();
    }
  }

  return {
    html,
    frontmatter,
    rawContent: content,
    headings,
    title,
  };
}

/**
 * Process a markdown file from the filesystem
 */
export async function processMarkdownFile(
  filePath: string,
  fs: { readFile: (path: string, encoding: string) => Promise<string> }
): Promise<MarkdownResult> {
  const source = await fs.readFile(filePath, 'utf-8');
  return processMarkdown(source);
}
