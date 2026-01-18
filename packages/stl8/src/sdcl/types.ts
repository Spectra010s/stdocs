/**
 * SDCL (Static Declaration Configuration Language) Types
 * 
 * Core type definitions for the SDCL language parser and stdocs configuration.
 * 
 * @module stl8/sdcl/types
 */

// ============================================================================
// Token Types
// ============================================================================

/**
 * All token types recognized by the SDCL lexer.
 */
export enum TokenType {
  DIRECTIVE = 'DIRECTIVE',       // @project, @section, @hero, @footer
  IDENTIFIER = 'IDENTIFIER',     // property names, section names
  STRING = 'STRING',             // "quoted string"
  NUMBER = 'NUMBER',             // 1, 2.5
  BOOLEAN = 'BOOLEAN',           // true, false
  LBRACE = 'LBRACE',             // {
  RBRACE = 'RBRACE',             // }
  DASH = 'DASH',                 // - (list items)
  COLON = 'COLON',               // : (property assignment)
  COMMENT = 'COMMENT',           // # comment
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

/**
 * A single token produced by the lexer.
 */
export interface Token {
  /** The token type */
  type: TokenType;
  /** The raw string value */
  value: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
}

// ============================================================================
// AST Node Types
// ============================================================================

/**
 * Any value that can appear in SDCL.
 * Supports primitives (string, number, boolean) and collections (array, object).
 */
export type SDCLValue = 
  | string 
  | number 
  | boolean 
  | SDCLArray 
  | SDCLObject;

/**
 * An array of SDCL values (used for lists with -).
 */
export type SDCLArray = SDCLValue[];

/**
 * A key-value object (used for inline { key: value } structures).
 */
export interface SDCLObject {
  [key: string]: SDCLValue;
}

/**
 * A single property within a directive.
 * 
 * @example
 * // title: "My Docs"
 * { key: "title", value: "My Docs", line: 2 }
 */
export interface SDCLProperty {
  /** Property name */
  key: string;
  /** Property value */
  value: SDCLValue;
  /** Line number where property appears */
  line: number;
}

/**
 * A directive node in the AST.
 * Directives are the main building blocks of SDCL (e.g., @project, @section).
 * 
 * @example
 * // @section "Getting Started" { order: 1 }
 * {
 *   type: 'directive',
 *   name: 'section',
 *   identifier: 'Getting Started',
 *   properties: [{ key: 'order', value: 1, line: 1 }],
 *   line: 1
 * }
 */
export interface SDCLDirective {
  type: 'directive'; 
  name: string;   // Directive name without @ (e.g., "project", "section") 
  /** Optional identifier. Quotes required if name contains spaces (e.g., @section "Getting Started") */
  identifier?: string;
  properties: Array<SDCLProperty | SDCLDirective>; // Child properties or nested directives 
  line: number; // Line number where directive starts 
}

/**
 * Root node of the SDCL AST.
 */
export interface SDCLDocument {
  type: 'document';
  directives: SDCLDirective[]; // All top-level directives
  comments: string[];          // Collected comments without # prefix
}

// ============================================================================
// Configuration Types (Validated StdocsConfig)
// ============================================================================

export interface SocialLink {
  label: string;
  url: string;
}

export interface HeaderConfig {
  links?: SocialLink[];    // Manual navigation links
  github?: string;        // GitHub repository URL (shows icon if set)
  themeToggle?: boolean;  // Enable/disable theme toggle (default: true)
  langSelect?: boolean;   // Enable/disable language dropdown (default: true)
  defaultLang?: string;   // Default language code (e.g., "en")
  sticky?: boolean;       // Whether header stays fixed at top
}

export interface FooterSection {
  title: string;
  links?: SocialLink[];
  auto?: boolean;         // If true, links are auto-generated from site structure
}

export interface FooterConfig {
  tagline?: string;
  madeBy?: string;
  sections?: FooterSection[];
  github?: string;
}

export interface ProjectConfig {
  title: string;          // Site title in browser tab
  description?: string;   // For SEO meta tags
  logo?: string;          // Path to logo image
  favicon?: string;       // Path to favicon
  version?: string;       // Project version (default: 1.0.0)
  theme?: string;         // Theme name (e.g., "default", "dark")
  baseUrl?: string;       // Base URL for the site (default: "/")
}

export interface HeroConfig {
  title: string;
  subtitle?: string;
  ctas?: Array<{ label: string; href: string }>;
  cards?: Array<{ label: string; group: string }>;
}

export interface SectionConfig {
  name: string;           // Section name (identifier)
  order: number;          // Display order
  pages: string[];        // Markdown file paths
}

export interface BuildConfig {
  outputDir: string;      // Output folder for generated site
  cleanFolder: boolean;   // Whether to wipe folder before build
}

/**
 * Complete stdocs configuration after validation.
 */
export interface StdocsConfig {
  project: ProjectConfig;
  header?: HeaderConfig;
  hero?: HeroConfig;
  footer?: FooterConfig;
  sections: SectionConfig[];
  build: BuildConfig;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error class for all SDCL errors with location information.
 */
export class SDCLError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public source?: string
  ) {
    super(`SDCL Error at line ${line}, column ${column}: ${message}`);
    this.name = 'SDCLError';
  }
}

export class SDCLSyntaxError extends SDCLError {
  constructor(message: string, line: number, column: number, source?: string) {
    super(message, line, column, source);
    this.name = 'SDCLSyntaxError';
  }
}

export class SDCLValidationError extends SDCLError {
  constructor(message: string, line: number, column: number, source?: string) {
    super(message, line, column, source);
    this.name = 'SDCLValidationError';
  }
}
