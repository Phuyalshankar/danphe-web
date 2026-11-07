'use strict';

/**
 * 🏛️ DANPHE RECURSIVE DESCENT PARSER (DanpheParser.js)
 * Produces clean Abstract Syntax Trees (AST) from token streams.
 * Eliminates all 410+ regex patterns for JSX and register DSL parsing.
 */

const { TokenType, DanpheLexer } = require('./DanpheLexer');
const {
  ProgramNode,
  RegisterDeclarationNode,
  JSXElementNode,
  JSXTextNode,
  JSXExpressionNode,
  MemberExpressionNode,
  IdentifierNode,
  LiteralNode
} = require('./ASTNodes');

class DanpheParser {
  constructor(tokens = []) {
    this.tokens = tokens;
    this.pos = 0;
  }

  static parse(source) {
    const lexer = new DanpheLexer(source);
    const tokens = lexer.tokenize();
    const parser = new DanpheParser(tokens);
    return parser.parseProgram();
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.tokens.length ? this.tokens[idx] : this.tokens[this.tokens.length - 1];
  }

  next() {
    return this.pos < this.tokens.length ? this.tokens[this.pos++] : this.tokens[this.tokens.length - 1];
  }

  match(type, value = null) {
    const t = this.peek();
    if (t.type === type && (value === null || t.value === value)) {
      return this.next();
    }
    return null;
  }

  expect(type, value = null) {
    const t = this.peek();
    if (t.type !== type || (value !== null && t.value !== value)) {
      throw new Error(`[DanpheParser] Unexpected token '${t.value}' (${t.type}) at line ${t.line}:${t.col}. Expected ${type}${value ? ' "' + value + '"' : ''}.`);
    }
    return this.next();
  }

  parseProgram() {
    const body = [];
    while (this.peek().type !== TokenType.EOF) {
      const node = this.parseStatement();
      if (node) body.push(node);
      else this.next(); // skip unknown token safely
    }
    return new ProgramNode(body);
  }

  parseStatement() {
    const t = this.peek();

    // 1. Dynamic Register Declaration: reg form:: name, email, phone;
    if (t.type === TokenType.KEYWORD && (t.value === 'reg' || t.value === 'register')) {
      return this.parseRegisterDeclaration();
    }

    // 2. JSX Element: <tag ...>
    if (t.type === TokenType.TAG_OPEN) {
      return this.parseJSXElement();
    }

    return null;
  }

  /**
   * Parses: reg form:: name, email, password;
   */
  parseRegisterDeclaration() {
    this.next(); // consume 'reg' or 'register'
    const nameToken = this.expect(TokenType.IDENTIFIER);
    const formId = nameToken.value;

    this.expect(TokenType.COLONCOLON); // consume '::'

    const fields = [];
    while (this.peek().type === TokenType.IDENTIFIER) {
      fields.push(this.next().value);
      if (this.match(TokenType.COMMA)) {
        continue;
      } else {
        break;
      }
    }

    this.match(TokenType.SEMICOLON); // optional trailing semicolon

    return new RegisterDeclarationNode(formId, fields, {
      line: nameToken.line,
      col: nameToken.col
    });
  }

  /**
   * Parses: <tag prop="val" prop={expr}> ... </tag> OR <tag />
   */
  parseJSXElement() {
    this.expect(TokenType.TAG_OPEN); // consume '<'
    const tagToken = this.expect(TokenType.IDENTIFIER);
    const tag = tagToken.value;

    const props = {};

    // Parse attributes
    while (this.peek().type !== TokenType.TAG_CLOSE && 
           this.peek().type !== TokenType.TAG_SELF_CLOSE && 
           this.peek().type !== TokenType.EOF) {
      
      const attrNameToken = this.match(TokenType.IDENTIFIER);
      if (!attrNameToken) break;

      const attrName = attrNameToken.value;
      let attrVal = true; // boolean attribute default

      if (this.match(TokenType.EQUALS)) {
        const next = this.peek();
        if (next.type === TokenType.STRING) {
          attrVal = new LiteralNode(this.next().value);
        } else if (next.type === TokenType.NUMBER) {
          attrVal = new LiteralNode(Number(this.next().value));
        } else if (this.match(TokenType.LBRACE)) {
          attrVal = this.parseExpression();
          this.expect(TokenType.RBRACE);
        }
      }

      props[attrName] = attrVal;
    }

    // Self closing <tag />
    if (this.match(TokenType.TAG_SELF_CLOSE)) {
      return new JSXElementNode(tag, props, [], { line: tagToken.line, col: tagToken.col });
    }

    // Regular close <tag>
    this.expect(TokenType.TAG_CLOSE);

    // Parse children
    const children = [];
    while (this.peek().type !== TokenType.TAG_END_OPEN && this.peek().type !== TokenType.EOF) {
      if (this.peek().type === TokenType.TAG_OPEN) {
        children.push(this.parseJSXElement());
      } else if (this.peek().type === TokenType.LBRACE) {
        this.next(); // {
        children.push(new JSXExpressionNode(this.parseExpression()));
        this.expect(TokenType.RBRACE);
      } else {
        // Raw text content
        const t = this.next();
        if (t.value && t.value.trim()) {
          children.push(new JSXTextNode(t.value));
        }
      }
    }

    // Expect closing tag </tag>
    this.expect(TokenType.TAG_END_OPEN);
    const closeTagToken = this.expect(TokenType.IDENTIFIER);
    if (closeTagToken.value !== tag) {
      throw new Error(`[DanpheParser] Mismatched closing tag. Expected </${tag}>, found </${closeTagToken.value}> at line ${closeTagToken.line}:${closeTagToken.col}`);
    }
    this.expect(TokenType.TAG_CLOSE);

    return new JSXElementNode(tag, props, children, { line: tagToken.line, col: tagToken.col });
  }

  /**
   * Parses expressions: identifiers, member expressions (form.fullName or form::fullName), literals
   */
  parseExpression() {
    const t = this.peek();

    if (t.type === TokenType.NUMBER) {
      return new LiteralNode(Number(this.next().value));
    }
    if (t.type === TokenType.STRING) {
      return new LiteralNode(this.next().value);
    }

    if (t.type === TokenType.IDENTIFIER) {
      let expr = new IdentifierNode(this.next().value);

      // Check for dot notation (userForm.fullName) or double-colon (userForm::fullName)
      while (this.peek().type === TokenType.DOT || this.peek().type === TokenType.COLONCOLON) {
        this.next(); // consume . or ::
        const propToken = this.expect(TokenType.IDENTIFIER);
        expr = new MemberExpressionNode(expr, new IdentifierNode(propToken.value));
      }

      return expr;
    }

    return new LiteralNode(this.next().value);
  }
}

module.exports = {
  DanpheParser
};
