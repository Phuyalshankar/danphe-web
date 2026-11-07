'use strict';

/**
 * ⚡ DANPHE DETERMINISTIC LEXER (DanpheLexer.js)
 * O(N) single-pass streaming character scanner.
 * Replaces ad-hoc regex with deterministic tokenization.
 */

const TokenType = Object.freeze({
  EOF: 'EOF',
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  COLONCOLON: 'COLONCOLON',     // ::
  TAG_OPEN: 'TAG_OPEN',         // <
  TAG_CLOSE: 'TAG_CLOSE',       // >
  TAG_SELF_CLOSE: 'TAG_SELF_CLOSE', // />
  TAG_END_OPEN: 'TAG_END_OPEN', // </
  EQUALS: 'EQUALS',             // =
  LBRACE: 'LBRACE',             // {
  RBRACE: 'RBRACE',             // }
  LPAREN: 'LPAREN',             // (
  RPAREN: 'RPAREN',             // )
  COMMA: 'COMMA',               // ,
  SEMICOLON: 'SEMICOLON',       // ;
  DOT: 'DOT',                   // .
  STRING: 'STRING',             // "..." or '...'
  NUMBER: 'NUMBER',             // 123, 0x4000
  TEXT: 'TEXT'                  // Raw text inside JSX
});

const KEYWORDS = new Set([
  'reg', 'register', 'export', 'default', 'import', 'from',
  'function', 'return', 'const', 'let', 'var', 'if', 'else'
]);

class Token {
  constructor(type, value, line = 1, col = 1) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

class DanpheLexer {
  constructor(input = '') {
    this.input = String(input);
    this.pos = 0;
    this.length = this.input.length;
    this.line = 1;
    this.col = 1;
    this.inJSX = false;
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.length ? this.input[idx] : '\0';
  }

  next() {
    if (this.pos >= this.length) return '\0';
    const ch = this.input[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  skipWhitespaceAndComments() {
    while (this.pos < this.length) {
      const ch = this.peek();
      // Whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.next();
        continue;
      }
      // Single line comment //
      if (ch === '/' && this.peek(1) === '/') {
        this.next(); this.next();
        while (this.pos < this.length && this.peek() !== '\n') {
          this.next();
        }
        continue;
      }
      // Multi-line comment /* ... */
      if (ch === '/' && this.peek(1) === '*') {
        this.next(); this.next();
        while (this.pos < this.length) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.next(); this.next();
            break;
          }
          this.next();
        }
        continue;
      }
      break;
    }
  }

  tokenize() {
    const tokens = [];
    let token = this.nextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.nextToken();
    }
    tokens.push(token); // EOF
    return tokens;
  }

  nextToken() {
    this.skipWhitespaceAndComments();

    if (this.pos >= this.length) {
      return new Token(TokenType.EOF, '', this.line, this.col);
    }

    const startLine = this.line;
    const startCol = this.col;
    const ch = this.peek();

    // Two-character operators
    if (ch === ':' && this.peek(1) === ':') {
      this.next(); this.next();
      return new Token(TokenType.COLONCOLON, '::', startLine, startCol);
    }

    if (ch === '<' && this.peek(1) === '/') {
      this.next(); this.next();
      return new Token(TokenType.TAG_END_OPEN, '</', startLine, startCol);
    }

    if (ch === '/' && this.peek(1) === '>') {
      this.next(); this.next();
      return new Token(TokenType.TAG_SELF_CLOSE, '/>', startLine, startCol);
    }

    // Single-character tokens
    if (ch === '<') { this.next(); return new Token(TokenType.TAG_OPEN, '<', startLine, startCol); }
    if (ch === '>') { this.next(); return new Token(TokenType.TAG_CLOSE, '>', startLine, startCol); }
    if (ch === '=') { this.next(); return new Token(TokenType.EQUALS, '=', startLine, startCol); }
    if (ch === '{') { this.next(); return new Token(TokenType.LBRACE, '{', startLine, startCol); }
    if (ch === '}') { this.next(); return new Token(TokenType.RBRACE, '}', startLine, startCol); }
    if (ch === '(') { this.next(); return new Token(TokenType.LPAREN, '(', startLine, startCol); }
    if (ch === ')') { this.next(); return new Token(TokenType.RPAREN, ')', startLine, startCol); }
    if (ch === ',') { this.next(); return new Token(TokenType.COMMA, ',', startLine, startCol); }
    if (ch === ';') { this.next(); return new Token(TokenType.SEMICOLON, ';', startLine, startCol); }
    if (ch === '.') { this.next(); return new Token(TokenType.DOT, '.', startLine, startCol); }

    // String literals: "...", '...', `...`
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = this.next();
      let str = '';
      while (this.pos < this.length) {
        const c = this.next();
        if (c === '\\') {
          str += this.next(); // Escape next char
        } else if (c === quote) {
          break;
        } else {
          str += c;
        }
      }
      return new Token(TokenType.STRING, str, startLine, startCol);
    }

    // Number literals (hex or decimal)
    if (ch >= '0' && ch <= '9') {
      let numStr = '';
      if (ch === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
        numStr += this.next(); // 0
        numStr += this.next(); // x
        while (this.pos < this.length && /[0-9a-fA-F]/.test(this.peek())) {
          numStr += this.next();
        }
      } else {
        while (this.pos < this.length && /[0-9.]/.test(this.peek())) {
          numStr += this.next();
        }
      }
      return new Token(TokenType.NUMBER, numStr, startLine, startCol);
    }

    // Identifiers and Keywords: [a-zA-Z_$][a-zA-Z0-9_$-]*
    if (/[a-zA-Z_$]/.test(ch)) {
      let ident = '';
      while (this.pos < this.length && /[a-zA-Z0-9_$-]/.test(this.peek())) {
        ident += this.next();
      }
      const type = KEYWORDS.has(ident) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
      return new Token(type, ident, startLine, startCol);
    }

    // Fallback for unexpected characters
    const unknown = this.next();
    return new Token(TokenType.TEXT, unknown, startLine, startCol);
  }
}

module.exports = {
  TokenType,
  Token,
  DanpheLexer
};
