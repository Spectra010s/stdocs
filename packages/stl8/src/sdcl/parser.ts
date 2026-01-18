import { 
  Token, 
  TokenType, 
  SDCLDocument, 
  SDCLDirective, 
  SDCLProperty, 
  SDCLValue,
  SDCLSyntaxError
} from './types.js';

/**
 * SDCL Parser
 * 
 * Recursive descent parser that converts Token stream into an AST.
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse the entire token stream into a Document
   */
  parse(): SDCLDocument {
    const directives: SDCLDirective[] = [];

    while (!this.isAtEnd()) {
      const token = this.peek();

      if (token.type === TokenType.DIRECTIVE) {
        directives.push(this.directive());
      } else if (token.type === TokenType.NEWLINE || token.type === TokenType.COMMENT) {
        this.advance();
      } else {
        throw new SDCLSyntaxError(
          `Unexpected token: ${token.type} (${token.value}). Expected top-level directive.`,
          token.line,
          token.column
        );
      }
    }

    return {
      type: 'document',
      directives,
      comments: [] // Collected by lexer independently
    };
  }

  /**
   * Parse a directive (@name identifier { ... })
   */
  private directive(): SDCLDirective {
    const token = this.consume(TokenType.DIRECTIVE, "Expected directive starting with @");
    const name = token.value;
    let identifier: string | undefined;

    // Optional identifier with optional quotes
    if (this.check(TokenType.STRING) || this.check(TokenType.IDENTIFIER)) {
      identifier = this.advance().value;
    }

    this.consume(TokenType.LBRACE, "Expected '{' after directive");
    
    const properties: Array<SDCLProperty | SDCLDirective> = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.DIRECTIVE)) {
        properties.push(this.directive());
      } else if (this.check(TokenType.IDENTIFIER)) {
        properties.push(this.property());
      } else if (this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
        this.advance();
      } else {
        const t = this.peek();
        throw new SDCLSyntaxError(`Unexpected token inside directive: ${t.type}`, t.line, t.column);
      }
    }

    this.consume(TokenType.RBRACE, "Expected '}' at end of directive");

    return {
      type: 'directive',
      name,
      identifier,
      properties,
      line: token.line
    };
  }

  /**
   * Parse a property (key: value)
   */
  private property(): SDCLProperty {
    const keyToken = this.consume(TokenType.IDENTIFIER, "Expected property key");
    this.consume(TokenType.COLON, "Expected ':' after property key");
    
    const value = this.value();

    return {
      key: keyToken.value,
      value,
      line: keyToken.line
    };
  }

  /**
   * Parse a value (primitive, array, or object)
   */
  private value(): SDCLValue {
    if (this.check(TokenType.STRING)) return this.advance().value;
    if (this.check(TokenType.NUMBER)) return parseFloat(this.advance().value);
    if (this.check(TokenType.BOOLEAN)) return this.advance().value === 'true';

    // Inline structures
    if (this.check(TokenType.LBRACE)) return this.inlineObject();

    // Dash-based lists
    if (this.check(TokenType.DASH)) return this.dashArray();

    if (this.match(TokenType.NEWLINE)) {
      this.skipIgnored();
      if (this.check(TokenType.DASH)) return this.dashArray();
    }

    const t = this.peek();
    throw new SDCLSyntaxError(`Unexpected value token: ${t.type}`, t.line, t.column);
  }

  /**
   * Parse a dash-based array
   * - item1
   * - item2
   */
  private dashArray(): SDCLValue[] {
    const items: SDCLValue[] = [];

    while (this.match(TokenType.DASH)) {
      items.push(this.value());
      this.match(TokenType.NEWLINE);
      this.skipIgnored();
    }

    return items;
  }


  /**
   * Parse an inline object { k: v, k2: v2 }
   */
  private inlineObject(): Record<string, SDCLValue> {
    this.advance(); // {
    const obj: Record<string, SDCLValue> = {};

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.skipIgnored();
      const key = this.consume(TokenType.IDENTIFIER, "Expected key").value;
      this.consume(TokenType.COLON, "Expected ':'");
      obj[key] = this.value();
      this.skipIgnored();
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return obj;
  }

  /**
   * Internal helpers
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const t = this.peek();
    throw new SDCLSyntaxError(message, t.line, t.column);
  }

  private skipIgnored(): void {
    while (this.match(TokenType.NEWLINE, TokenType.COMMENT)) {}
  }

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }
}
