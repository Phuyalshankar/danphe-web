'use strict';

/**
 * 🏛️ DANPHE RECURSIVE DESCENT PARSER (DanpheParser.js)
 * ─────────────────────────────────────────────────────────────
 * Produces an immutable, typed Abstract Syntax Tree (AST) from token streams.
 * Eliminates ad-hoc regex, providing deterministic syntax validation with
 * precise line and column error diagnostics.
 */

const { TokenType, DanpheLexer } = require('./DanpheLexer');
const {
  ProgramNode,
  FunctionDeclarationNode,
  ReturnStatementNode,
  RegisterDeclarationNode,
  JSXElementNode,
  JSXFragmentNode,
  JSXTextNode,
  JSXExpressionNode,
  JSXSpreadAttributeNode,
  MemberExpressionNode,
  IdentifierNode,
  LiteralNode,
  CallExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  ConditionalExpressionNode,
  ArrowFunctionExpressionNode,
  ObjectExpressionNode,
  PropertyNode,
  ArrayExpressionNode
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
      throw new Error(`[DanpheParser] Syntax Error at line ${t.line}:${t.col}: Unexpected token '${t.value}' (${t.type}). Expected ${type}${value ? ' "' + value + '"' : ''}.`);
    }
    return this.next();
  }

  parseProgram() {
    const body = [];
    while (this.peek().type !== TokenType.EOF) {
      const stmt = this.parseTopLevelStatement();
      if (stmt) {
        body.push(stmt);
      } else {
        this.next(); // Safely advance if unhandled
      }
    }
    return new ProgramNode(body);
  }

  parseTopLevelStatement() {
    const t = this.peek();

    // 1. Dynamic Register Declaration: reg form:: name, email, phone;
    if (t.type === TokenType.KEYWORD && (t.value === 'reg' || t.value === 'register')) {
      return this.parseRegisterDeclaration();
    }

    // 2. Export declarations: export default function App() {} or export const X = ...
    if (t.type === TokenType.KEYWORD && t.value === 'export') {
      this.next(); // consume 'export'
      const isDefault = Boolean(this.match(TokenType.KEYWORD, 'default'));
      if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'function') {
        return this.parseFunctionDeclaration(true, isDefault);
      }
      if (isDefault) {
        const expr = this.parseExpression();
        this.match(TokenType.SEMICOLON);
        return new FunctionDeclarationNode(expr.name || 'DefaultExport', [], [], true, true);
      }
    }

    // 3. Standard function declaration: function App(props) { ... }
    if (t.type === TokenType.KEYWORD && t.value === 'function') {
      return this.parseFunctionDeclaration(false, false);
    }

    // 4. Return statement: return ( <JSX> )
    if (t.type === TokenType.KEYWORD && t.value === 'return') {
      return this.parseReturnStatement();
    }

    // 5. Direct JSX Element: <tag ...> ... </tag>
    if (t.type === TokenType.TAG_OPEN) {
      return this.parseJSXElement();
    }

    // 6. Direct JSX Fragment: <> ... </>
    if (t.type === TokenType.TAG_FRAGMENT_OPEN) {
      return this.parseJSXFragment();
    }

    return null;
  }

  /**
   * Parses: function Name(param1, param2) { ... body ... } with nested brace tracking
   */
  parseFunctionDeclaration(isExported = false, isDefault = false) {
    const fnToken = this.expect(TokenType.KEYWORD, 'function');
    let name = 'AnonymousComponent';
    if (this.peek().type === TokenType.IDENTIFIER) {
      name = this.next().value;
    }

    this.expect(TokenType.LPAREN);
    const params = [];
    while (this.peek().type !== TokenType.RPAREN && this.peek().type !== TokenType.EOF) {
      if (this.peek().type === TokenType.IDENTIFIER) {
        params.push(this.next().value);
      }
      this.match(TokenType.COMMA);
    }
    this.expect(TokenType.RPAREN);

    this.expect(TokenType.LBRACE);
    const body = [];
    let depth = 1;

    while (depth > 0 && this.peek().type !== TokenType.EOF) {
      if (this.peek().type === TokenType.LBRACE) {
        depth++;
        this.next();
      } else if (this.peek().type === TokenType.RBRACE) {
        depth--;
        if (depth === 0) {
          this.next(); // Consume outer closing brace
          break;
        } else {
          this.next();
        }
      } else if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'return') {
        body.push(this.parseReturnStatement());
      } else if (this.peek().type === TokenType.TAG_OPEN) {
        body.push(this.parseJSXElement());
      } else {
        this.next();
      }
    }

    return new FunctionDeclarationNode(name, params, body, isExported, isDefault, {
      line: fnToken.line,
      col: fnToken.col
    });
  }

  /**
   * Parses: return ( <JSX> );
   */
  parseReturnStatement() {
    const retToken = this.expect(TokenType.KEYWORD, 'return');
    const hasParen = Boolean(this.match(TokenType.LPAREN));
    let argument = null;

    if (this.peek().type === TokenType.TAG_OPEN) {
      argument = this.parseJSXElement();
    } else if (this.peek().type === TokenType.TAG_FRAGMENT_OPEN) {
      argument = this.parseJSXFragment();
    } else {
      argument = this.parseExpression();
    }

    if (hasParen) {
      this.expect(TokenType.RPAREN);
    }
    this.match(TokenType.SEMICOLON);

    return new ReturnStatementNode(argument, { line: retToken.line, col: retToken.col });
  }

  /**
   * Parses: reg form:: name, email, phone;
   */
  parseRegisterDeclaration() {
    const regToken = this.next(); // consume 'reg' or 'register'
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

    this.match(TokenType.SEMICOLON);

    return new RegisterDeclarationNode(formId, fields, {
      line: regToken.line,
      col: regToken.col
    });
  }

  /**
   * Parses JSX Fragment: <> ... children ... </>
   */
  parseJSXFragment() {
    const fragToken = this.expect(TokenType.TAG_FRAGMENT_OPEN);
    const children = this.parseJSXChildren();
    this.expect(TokenType.TAG_FRAGMENT_CLOSE);
    return new JSXFragmentNode(children, { line: fragToken.line, col: fragToken.col });
  }

  /**
   * Parses JSX Element: <tag prop="val" ...> ... </tag> OR <tag />
   */
  parseJSXElement() {
    const openToken = this.expect(TokenType.TAG_OPEN); // consume '<'
    const tagToken = this.expect(TokenType.IDENTIFIER);
    let tag = tagToken.value;
    while (this.match(TokenType.DOT)) {
      const subTagToken = this.expect(TokenType.IDENTIFIER);
      tag += '.' + subTagToken.value;
    }

    const props = {};

    // Parse attributes
    while (this.peek().type !== TokenType.TAG_CLOSE &&
           this.peek().type !== TokenType.TAG_SELF_CLOSE &&
           this.peek().type !== TokenType.EOF) {

      // Spread attribute: {...props}
      if (this.peek().type === TokenType.LBRACE && this.peek(1).type === TokenType.ELLIPSIS) {
        this.next(); // {
        this.next(); // ...
        const arg = this.parseExpression();
        this.expect(TokenType.RBRACE);
        props['__spread_' + Object.keys(props).length] = new JSXSpreadAttributeNode(arg);
        continue;
      }

      const attrNameToken = this.match(TokenType.IDENTIFIER);
      if (!attrNameToken) break;

      const attrName = attrNameToken.value;
      let attrVal = new LiteralNode(true); // Boolean attribute default (e.g. disabled)

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
    const children = this.parseJSXChildren();

    // Closing tag </tag>
    this.expect(TokenType.TAG_END_OPEN);
    const closeTagToken = this.expect(TokenType.IDENTIFIER);
    let closeTag = closeTagToken.value;
    while (this.match(TokenType.DOT)) {
      const sub = this.expect(TokenType.IDENTIFIER);
      closeTag += '.' + sub.value;
    }
    if (closeTag !== tag) {
      throw new Error(`[DanpheParser] Mismatched closing tag at line ${closeTagToken.line}:${closeTagToken.col}. Expected </${tag}>, found </${closeTag}>`);
    }
    this.expect(TokenType.TAG_CLOSE);

    return new JSXElementNode(tag, props, children, { line: tagToken.line, col: tagToken.col });
  }

  /**
   * Helper to parse children inside a JSX element or fragment
   */
  parseJSXChildren() {
    const children = [];
    let textBuffer = '';

    const flushText = () => {
      const clean = textBuffer.trim();
      if (clean) {
        children.push(new JSXTextNode(clean));
      }
      textBuffer = '';
    };

    while (this.peek().type !== TokenType.TAG_END_OPEN &&
           this.peek().type !== TokenType.TAG_FRAGMENT_CLOSE &&
           this.peek().type !== TokenType.EOF) {

      if (this.peek().type === TokenType.TAG_OPEN) {
        flushText();
        children.push(this.parseJSXElement());
      } else if (this.peek().type === TokenType.TAG_FRAGMENT_OPEN) {
        flushText();
        children.push(this.parseJSXFragment());
      } else if (this.peek().type === TokenType.LBRACE) {
        flushText();
        this.next(); // {
        children.push(new JSXExpressionNode(this.parseExpression()));
        this.expect(TokenType.RBRACE);
      } else {
        // Collect text content (handles plain words, numbers, and Devanagari text)
        const t = this.next();
        textBuffer += (textBuffer ? ' ' : '') + t.value;
      }
    }

    flushText();
    return children;
  }

  /**
   * Parse expressions: conditionals (a ? b : c), binary, unary, member, calls, objects, arrays
   */
  parseExpression() {
    return this.parseConditionalExpression();
  }

  parseConditionalExpression() {
    let expr = this.parseLogicalOr();

    if (this.peek().type === TokenType.OPERATOR && this.peek().value === '?') {
      this.next(); // consume '?'
      const consequent = this.parseExpression();
      this.expect(TokenType.OPERATOR, ':');
      const alternate = this.parseExpression();
      return new ConditionalExpressionNode(expr, consequent, alternate);
    }

    return expr;
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.peek().type === TokenType.OPERATOR && this.peek().value === '||') {
      const op = this.next().value;
      const right = this.parseLogicalAnd();
      left = new BinaryExpressionNode(op, left, right);
    }
    return left;
  }

  parseLogicalAnd() {
    let left = this.parseEquality();
    while (this.peek().type === TokenType.OPERATOR && this.peek().value === '&&') {
      const op = this.next().value;
      const right = this.parseEquality();
      left = new BinaryExpressionNode(op, left, right);
    }
    return left;
  }

  parseEquality() {
    let left = this.parseRelational();
    while (this.peek().type === TokenType.OPERATOR && ['===', '!==', '==', '!='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseRelational();
      left = new BinaryExpressionNode(op, left, right);
    }
    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();
    const isRelational = (t) => {
      if (t.type === TokenType.OPERATOR && ['<=', '>='].includes(t.value)) return true;
      if (t.type === TokenType.TAG_CLOSE && t.value === '>') return true;
      if (t.type === TokenType.TAG_OPEN && t.value === '<') return true;
      return false;
    };

    while (isRelational(this.peek())) {
      const op = this.next().value;
      const right = this.parseAdditive();
      left = new BinaryExpressionNode(op, left, right);
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.peek().type === TokenType.OPERATOR && ['+', '-'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = new BinaryExpressionNode(op, left, right);
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnaryExpression();
    while (this.peek().type === TokenType.OPERATOR && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseUnaryExpression();
      left = new BinaryExpressionNode(op, left, right);
    }
    return left;
  }

  parseUnaryExpression() {
    if (this.peek().type === TokenType.OPERATOR && (this.peek().value === '!' || this.peek().value === '-')) {
      const op = this.next().value;
      const arg = this.parseUnaryExpression();
      return new UnaryExpressionNode(op, arg, true);
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const t = this.peek();

    // 1. Number literal
    if (t.type === TokenType.NUMBER) {
      return new LiteralNode(Number(this.next().value));
    }

    // 2. String literal
    if (t.type === TokenType.STRING) {
      return new LiteralNode(this.next().value);
    }

    // 3. Boolean / Null / Undefined keywords
    if (t.type === TokenType.KEYWORD) {
      if (t.value === 'true') { this.next(); return new LiteralNode(true); }
      if (t.value === 'false') { this.next(); return new LiteralNode(false); }
      if (t.value === 'null') { this.next(); return new LiteralNode(null); }
      if (t.value === 'undefined') { this.next(); return new LiteralNode(undefined); }
    }

    // 4. Object literal: { key: value, ... }
    if (t.type === TokenType.LBRACE) {
      return this.parseObjectLiteral();
    }

    // 5. Array literal: [ item1, item2, ... ]
    if (t.type === TokenType.LBRACKET) {
      return this.parseArrayLiteral();
    }

    // 6. Parenthesized expression or arrow function: (a, b) => expr
    if (t.type === TokenType.LPAREN) {
      this.next(); // consume '('
      if (this.match(TokenType.RPAREN)) {
        if (this.match(TokenType.ARROW)) {
          return new ArrowFunctionExpressionNode([], this.parseExpression());
        }
        return new LiteralNode(undefined);
      }

      const items = [];
      while (this.peek().type !== TokenType.RPAREN && this.peek().type !== TokenType.EOF) {
        items.push(this.parseExpression());
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.RPAREN);

      if (this.match(TokenType.ARROW)) {
        const params = items.map(item => item instanceof IdentifierNode ? item.name : (item.name || item.id || String(item.value || 'param')));
        return new ArrowFunctionExpressionNode(params, this.parseExpression());
      }

      return items.length === 1 ? items[0] : new ArrayExpressionNode(items);
    }

    // 7. Embedded JSX inside expression: { <Child /> }
    if (t.type === TokenType.TAG_OPEN) {
      return this.parseJSXElement();
    }

    // 8. Identifier or Member/Call expression
    if (t.type === TokenType.IDENTIFIER) {
      let expr = new IdentifierNode(this.next().value);

      while (true) {
        if (this.match(TokenType.DOT) || this.match(TokenType.COLONCOLON)) {
          const propToken = this.expect(TokenType.IDENTIFIER);
          expr = new MemberExpressionNode(expr, new IdentifierNode(propToken.value));
        } else if (this.match(TokenType.LBRACKET)) {
          const propExpr = this.parseExpression();
          this.expect(TokenType.RBRACKET);
          expr = new MemberExpressionNode(expr, propExpr, true);
        } else if (this.match(TokenType.LPAREN)) {
          const args = [];
          while (this.peek().type !== TokenType.RPAREN && this.peek().type !== TokenType.EOF) {
            args.push(this.parseExpression());
            this.match(TokenType.COMMA);
          }
          this.expect(TokenType.RPAREN);
          expr = new CallExpressionNode(expr, args);
        } else {
          break;
        }
      }

      // Check arrow function: ident => expr
      if (this.match(TokenType.ARROW)) {
        return new ArrowFunctionExpressionNode([expr], this.parseExpression());
      }

      return expr;
    }

    return new LiteralNode(this.next().value);
  }

  parseObjectLiteral() {
    this.expect(TokenType.LBRACE);
    const properties = [];
    while (this.peek().type !== TokenType.RBRACE && this.peek().type !== TokenType.EOF) {
      let key = '';
      if (this.peek().type === TokenType.IDENTIFIER || this.peek().type === TokenType.STRING) {
        key = this.next().value;
      }
      this.expect(TokenType.OPERATOR, ':');
      const val = this.parseExpression();
      properties.push(new PropertyNode(key, val));
      this.match(TokenType.COMMA);
    }
    this.expect(TokenType.RBRACE);
    return new ObjectExpressionNode(properties);
  }

  parseArrayLiteral() {
    this.expect(TokenType.LBRACKET);
    const elements = [];
    while (this.peek().type !== TokenType.RBRACKET && this.peek().type !== TokenType.EOF) {
      elements.push(this.parseExpression());
      this.match(TokenType.COMMA);
    }
    this.expect(TokenType.RBRACKET);
    return new ArrayExpressionNode(elements);
  }
}

module.exports = {
  DanpheParser
};
