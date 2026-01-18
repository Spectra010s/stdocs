/**
 * Filesystem Walker & URL Utilities
 * 
 * Handles discovery of markdown files, generation of SEO-friendly URLs,
 * and semantic sorting of project content.
 * 
 * @module stl8/engine/walker
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface WalkerOptions {
  /** File extensions to include (default: ['.md']) */
  extensions?: string[];
  /** Directories to exclude (default: node_modules, .git, etc.) */
  excludes?: string[];
}

const DEFAULT_EXTENSIONS = ['.md'];
const DEFAULT_EXCLUDES = ['node_modules', '.git', 'dist', 'build', 'site'];

/**
 * Result of a file discovery walk
 */
export interface WalkResult {
  /** Absolute path to the file */
  absolutePath: string;
  /** Path relative to the root directory */
  relativePath: string;
  /** Generated SEO-friendly URL */
  url: string;
}

/**
 * Discovers markdown files and prepares them for processing
 */
export class Walker {
  private rootDir: string;
  private extensions: string[];
  private excludes: Set<string>;

  constructor(rootDir: string, options: WalkerOptions = {}) {
    this.rootDir = path.resolve(rootDir);
    this.extensions = options.extensions || DEFAULT_EXTENSIONS;
    this.excludes = new Set([...DEFAULT_EXCLUDES, ...(options.excludes || [])]);
  }

  /**
   * Walk the root directory and find all matching markdown files
   */
  async walk(): Promise<WalkResult[]> {
    const results: WalkResult[] = [];
    await this.scanDir(this.rootDir, results);
    return this.sortResults(results);
  }

  private async scanDir(currentDir: string, results: WalkResult[]): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const name = entry.name;

      // Skip hidden files and excluded directories
      if (name.startsWith('.') || this.excludes.has(name)) continue;

      const fullPath = path.join(currentDir, name);

      if (entry.isDirectory()) {
        await this.scanDir(fullPath, results);
      } else if (entry.isFile()) {
        const ext = path.extname(name).toLowerCase();
        if (this.extensions.includes(ext)) {
          const relativePath = path.relative(this.rootDir, fullPath);
          results.push({
            absolutePath: fullPath,
            relativePath,
            url: this.computeUrl(relativePath)
          });
        }
      }
    }
  }

  /**
   * Generates a clean, SEO-friendly URL from a file path
   * 
   * @example
   * // "getting-started.md" -> "/getting-started/"
   * // "api/index.md" -> "/api/"
   */
  computeUrl(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    const lastPart = parts.pop()!;
    const name = lastPart.replace(/\.md$/i, '');

    // If it's an index file, the URL is just the directory path
    if (name.toLowerCase() === 'index' || name.toLowerCase() === 'readme') {
      return parts.length === 0 ? '/' : `/${parts.join('/')}/`;
    }

    // Otherwise, append the slugified name
    const slug = this.slugify(name);
    return `/${[...parts, slug].join('/')}/`;
  }

  /**
   * Sorts results using the "Smart Discovery" philosophy:
   * 1. Anchor (Index/README)
   * 2. Story (Sequential numbering)
   * 3. General (Alphabetical)
   * 4. Utility (license, roadmap, etc.)
   */
  private sortResults(results: WalkResult[]): WalkResult[] {
    const getPriority = (res: WalkResult): number => {
      const name = path.basename(res.relativePath, '.md').toLowerCase();
      
      // Tier 1: Anchor
      if (name === 'index' || name === 'readme') return 1;

      // Tier 4: Utility
      if (['license', 'contributing', 'roadmap', 'changelog'].includes(name)) return 4;

      // Tier 2: Story (Sequential)
      if (/^\d+[-_.]/.test(name)) return 2;

      // Tier 3: General
      return 3;
    };

    return [...results].sort((a, b) => {
      const pa = getPriority(a);
      const pb = getPriority(b);

      if (pa !== pb) return pa - pb;

      // If priorities are same, do numeric or alphabetical
      return a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
