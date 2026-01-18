/**
 * SDCL Module - Public API
 * 
 * Exports the SDCL parser, lexer, validator, and types.
 */

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Validator } from './validator.js';
import { StdocsConfig } from './types.js';

export { Lexer } from './lexer.js';
export { Parser } from './parser.js';
export { Validator } from './validator.js';
export * from './types.js';

/**
 * Convenience function to parse and validate SDCL source in one step.
 * 
 * @param source The SDCL source code string
 * @returns Validated StdocsConfig object
 */
export function parseConfig(source: string): StdocsConfig {
  const { tokens } = new Lexer(source).tokenize();
  const doc = new Parser(tokens).parse();
  return new Validator(doc).validate();
}
