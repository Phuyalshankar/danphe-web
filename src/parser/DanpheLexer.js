'use strict';

/**
 * ⚡ DANPHE DETERMINISTIC LEXER (DanpheLexer.js)
 * ─────────────────────────────────────────────────────────────
 * O(N) streaming character tokenizer with line:col error tracking.
 * Replaces ad-hoc string regex with formal lexical analysis.
 * Fully supports JSX, Devanagari Unicode, Register DSL, and modern JS.
 */

const TokenType = Object.freeze({
  EOF: 'EOF',
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  COLONCOLON: 'COLONCOLON',           // ::
  TAG_OPEN: 'TAG_OPEN',               // <
  TAG_CLOSE: 'TAG_CLOSE',             // >
  TAG_SELF_CLOSE: 'TAG_SELF_CLOSE',   // />
  TAG_END_OPEN: 'TAG_END_OPEN',       // </
  TAG_FRAGMENT_OPEN: 'TAG_FRAGMENT_OPEN', // <>
  TAG_FRAGMENT_CLOSE: 'TAG_FRAGMENT_CLOSE', // </>
  EQUALS: 'EQUALS',                   // =
  ARROW: 'ARROW',                     // =>
  ELLIPSIS: 'ELLIPSIS',               // ...
  LBRACE: 'LBRACE',                   // {
  RBRACE: 'RBRACE',                   // }
  LPAREN: 'LPAREN',                   // (
  RPAREN: 'RPAREN',                   // )
  LBRACKET: 'LBRACKET',               // [
  RBRACKET: 'RBRACKET',               // ]
  COMMA: 'COMMA',                     // ,
  SEMICOLON: 'SEMICOLON',             // ;
  DOT: 'DOT',                         // .
  OPERATOR: 'OPERATOR',               // +, -, *, /, !, ?, :, &&, ||, ===, !==, ==, !=, <=, >=
  STRING: 'STRING',                   // "...", '...', `...`
  NUMBER: 'NUMBER',                   // 123, 0x4000, 3.14
  TEXT: 'TEXT'                        // Raw text inside JSX elements
});

const KEYWORDS = new Set([
  'reg', 'register', 'export', 'default', 'import', 'from',
  'function', 'return', 'const', 'let', 'var', 'if', 'else',
  'true', 'false', 'null', 'undefined', 'async', 'await'
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

      // Single line comment: // ...
      if (ch === '/' && this.peek(1) === '/') {
        this.next(); this.next();
        while (this.pos < this.length && this.peek() !== '\n') {
          this.next();
        }
        continue;
      }

      // Multi-line comment: /* ... */
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
    tokens.push(token); // Final EOF
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

    // 1. Fragment tags: <> or </>
    if (ch === '<' && this.peek(1) === '>') {
      this.next(); this.next();
      return new Token(TokenType.TAG_FRAGMENT_OPEN, '<>', startLine, startCol);
    }
    if (ch === '<' && this.peek(1) === '/' && this.peek(2) === '>') {
      this.next(); this.next(); this.next();
      return new Token(TokenType.TAG_FRAGMENT_CLOSE, '</>', startLine, startCol);
    }

    // 2. Multi-character operators and JSX tags
    if (ch === '<' && this.peek(1) === '/') {
      this.next(); this.next();
      return new Token(TokenType.TAG_END_OPEN, '</', startLine, startCol);
    }
    if (ch === '/' && this.peek(1) === '>') {
      this.next(); this.next();
      return new Token(TokenType.TAG_SELF_CLOSE, '/>', startLine, startCol);
    }
    if (ch === ':' && this.peek(1) === ':') {
      this.next(); this.next();
      return new Token(TokenType.COLONCOLON, '::', startLine, startCol);
    }
    if (ch === '=' && this.peek(1) === '>') {
      this.next(); this.next();
      return new Token(TokenType.ARROW, '=>', startLine, startCol);
    }
    if (ch === '.' && this.peek(1) === '.' && this.peek(2) === '.') {
      this.next(); this.next(); this.next();
      return new Token(TokenType.ELLIPSIS, '...', startLine, startCol);
    }

    // Logical & Equality operators
    if (ch === '=' && this.peek(1) === '=' && this.peek(2) === '=') {
      this.next(); this.next(); this.next();
      return new Token(TokenType.OPERATOR, '===', startLine, startCol);
    }
    if (ch === '!' && this.peek(1) === '=' && this.peek(2) === '=') {
      this.next(); this.next(); this.next();
      return new Token(TokenType.OPERATOR, '!==', startLine, startCol);
    }
    if (ch === '=' && this.peek(1) === '=') {
      this.next(); this.next();
      return new Token(TokenType.OPERATOR, '==', startLine, startCol);
    }
    if (ch === '!' && this.peek(1) === '=') {
      this.next(); this.next();
      return new Token(TokenType.OPERATOR, '!=', startLine, startCol);
    }
    if (ch === '&' && this.peek(1) === '&') {
      this.next(); this.next();
      return new Token(TokenType.OPERATOR, '&&', startLine, startCol);
    }
    if (ch === '|' && this.peek(1) === '|') {
      this.next(); this.next();
      return new Token(TokenType.OPERATOR, '||', startLine, startCol);
    }
    if (ch === '<' && this.peek(1) === '=') {
      this.next(); this.next();
      return new Token(TokenType.OPERATOR, '<=', startLine, startCol);
    }
    if (ch === '>' && this.peek(1) === '=') {
      this.next(); this.next();
      return new Token(TokenType.OPERATOR, '>=', startLine, startCol);
    }

    // Single-character syntax tokens
    if (ch === '<') { this.next(); return new Token(TokenType.TAG_OPEN, '<', startLine, startCol); }
    if (ch === '>') { this.next(); return new Token(TokenType.TAG_CLOSE, '>', startLine, startCol); }
    if (ch === '=') { this.next(); return new Token(TokenType.EQUALS, '=', startLine, startCol); }
    if (ch === '{') { this.next(); return new Token(TokenType.LBRACE, '{', startLine, startCol); }
    if (ch === '}') { this.next(); return new Token(TokenType.RBRACE, '}', startLine, startCol); }
    if (ch === '(') { this.next(); return new Token(TokenType.LPAREN, '(', startLine, startCol); }
    if (ch === ')') { this.next(); return new Token(TokenType.RPAREN, ')', startLine, startCol); }
    if (ch === '[') { this.next(); return new Token(TokenType.LBRACKET, '[', startLine, startCol); }
    if (ch === ']') { this.next(); return new Token(TokenType.RBRACKET, ']', startLine, startCol); }
    if (ch === ',') { this.next(); return new Token(TokenType.COMMA, ',', startLine, startCol); }
    if (ch === ';') { this.next(); return new Token(TokenType.SEMICOLON, ';', startLine, startCol); }
    if (ch === '.') { this.next(); return new Token(TokenType.DOT, '.', startLine, startCol); }

    // Arithmetic and unary operators
    if ('+-*/!?:'.includes(ch)) {
      this.next();
      return new Token(TokenType.OPERATOR, ch, startLine, startCol);
    }

    // 3. String literals: "...", '...', `...` (Supports Unicode / Devanagari)
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = this.next();
      let str = '';
      let terminated = false;
      while (this.pos < this.length) {
        const c = this.next();
        if (c === '\\') {
          const nextC = this.next();
          if (nextC === 'n') str += '\n';
          else if (nextC === 't') str += '\t';
          else if (nextC === 'r') str += '\r';
          else if (nextC === '\\') str += '\\';
          else if (nextC === quote) str += quote;
          else str += '\\' + nextC;
        } else if (c === quote) {
          terminated = true;
          break;
        } else {
          str += c;
        }
      }
      if (!terminated) {
        throw new Error(`[DanpheLexer] Unterminated string literal at line ${startLine}:${startCol}`);
      }
      return new Token(TokenType.STRING, str, startLine, startCol);
    }

    // 4. Number literals: Hex (0x4000) or Decimal (100, 3.14)
    if (ch >= '0' && ch <= '9') {
      let numStr = '';
      if (ch === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
        numStr += this.next(); // 0
        numStr += this.next(); // x
        while (this.pos < this.length && /[0-9a-fA-F]/.test(this.peek())) {
          numStr += this.next();
        }
      } else {
        let hasDot = false;
        while (this.pos < this.length) {
          const p = this.peek();
          if (p >= '0' && p <= '9') {
            numStr += this.next();
          } else if (p === '.' && !hasDot && this.peek(1) >= '0' && this.peek(1) <= '9') {
            hasDot = true;
            numStr += this.next();
          } else {
            break;
          }
        }
      }
      return new Token(TokenType.NUMBER, numStr, startLine, startCol);
    }

    // 5. Identifiers and Keywords (Unicode / Devanagari friendly)
    // Matches ASCII identifiers or Devanagari Unicode (\u0900-\u097F)
    if (/[a-zA-Z_$]/.test(ch) || (ch >= '\u0900' && ch <= '\u097F')) {
      let ident = '';
      while (this.pos < this.length) {
        const c = this.peek();
        if (/[a-zA-Z0-9_$-]/.test(c) || (c >= '\u0900' && c <= '\u097F')) {
          ident += this.next();
        } else {
          break;
        }
      }
      const type = KEYWORDS.has(ident) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
      return new Token(type, ident, startLine, startCol);
    }

    // 6. Fallback raw text
    const rawChar = this.next();
    return new Token(TokenType.TEXT, rawChar, startLine, startCol);
  }
}

module.exports = {
  TokenType,
  Token,
  DanpheLexer
};
