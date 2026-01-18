import { Token, TokenType, SDCLSyntaxError } from './types.js';

/**
 * SDCL Lexer
 * 
 * Converts source code string into a stream of tokens and collects comments.
 */
export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private comments: string[] = [];

  constructor(source: string) {
    this.source = source;
  }

   /**
   * Tokenize the entire source
   */
  tokenize(): { tokens: Token[]; comments: string[] } {
    const tokens: Token[] = [];
    
    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push(this.createToken(TokenType.EOF, ''));
    return { tokens, comments: this.comments };
  }

  /**
   * Get next token
   */
  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.isAtEnd()) return null;

    const char = this.peek();

    // Comments (#)
    if (char === '#') {
      this.readComment();
      return null;
    }

    // Newlines
    if (char === '\n') {
      const token = this.createToken(TokenType.NEWLINE, '\n');
      this.advance();
      this.line++;
      this.column = 1;
      return token;
    }

    // Directives (@)
    if (char === '@') {
      return this.readDirective();
    }

    // Strings ("" or '')
    if (char === '"' || char === "'") {
      return this.readString(char);
    }

    // Numbers
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek(1)))) {
      return this.readNumber();
    }

    // Delimiters and Operators
    if (char === '{') { this.advance(); return this.createToken(TokenType.LBRACE, '{'); }
    if (char === '}') { this.advance(); return this.createToken(TokenType.RBRACE, '}'); }
    if (char === '[') { this.advance(); return this.createToken(TokenType.LBRACKET, '['); }
    if (char === ']') { this.advance(); return this.createToken(TokenType.RBRACKET, ']'); }
    if (char === ':') { this.advance(); return this.createToken(TokenType.COLON, ':'); }
    if (char === '-') { this.advance(); return this.createToken(TokenType.DASH, '-'); }

    // Identifiers and Booleans
    if (this.isAlpha(char)) {
      return this.readIdentifier();
    }

    throw new SDCLSyntaxError(
      `Unexpected character: '${char}'`, 
      this.line, 
      this.column,
      this.getCurrentLine()
    );
  }

  private readDirective(): Token {
    const startCol = this.column;
    this.advance(); // consume @
    const start = this.pos;
    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      this.advance();
    }
    const name = this.source.substring(start, this.pos);
    return {
      type: TokenType.DIRECTIVE,
      value: name,
      line: this.line,
      column: startCol
    };
  }

  private readIdentifier(): Token {
    const startCol = this.column;
    const start = this.pos;
    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      this.advance();
    }
    const value = this.source.substring(start, this.pos);

    if (value === 'true' || value === 'false') {
      return {
        type: TokenType.BOOLEAN,
        value,
        line: this.line,
        column: startCol
      };
    }

    return {
      type: TokenType.IDENTIFIER,
      value,
      line: this.line,
      column: startCol
    };
  }

  private readString(quote: string): Token {
    const startCol = this.column;
    this.advance(); // consume opening quote
    const start = this.pos;
    
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        throw new SDCLSyntaxError('Unterminated string literal', this.line, this.column, this.getCurrentLine());
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new SDCLSyntaxError('Unterminated string literal', this.line, this.column, this.getCurrentLine());
    }

    const value = this.source.substring(start, this.pos);
    this.advance(); // consume closing quote
    
    return {
      type: TokenType.STRING,
      value,
      line: this.line,
      column: startCol
    };
  }

  private readNumber(): Token {
    const startCol = this.column;
    const start = this.pos;
    
    if (this.peek() === '-') {
      this.advance();
    }

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.substring(start, this.pos);
    return {
      type: TokenType.NUMBER,
      value,
      line: this.line,
      column: startCol
    };
  }

  private readComment(): void {
    const start = this.pos + 1; // skip #
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
    const comment = this.source.substring(start, this.pos).trim();
    if (comment) {
      this.comments.push(comment);
    }
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\r' || char === '\t') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private advance(): string {
    const char = this.source[this.pos++];
    this.column++;
    return char;
  }

  private peek(offset: number = 0): string {
    if (this.pos + offset >= this.source.length) return '';
    return this.source[this.pos + offset];
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private createToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    };
  }

  private getCurrentLine(): string {
    const lines = this.source.split('\n');
    return lines[this.line - 1] || '';
  }
}
