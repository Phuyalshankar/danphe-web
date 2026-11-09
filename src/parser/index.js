'use strict';

/**
 * 🏛️ DANPHE PARSER SUBSYSTEM (src/parser/index.js)
 * Master export for deterministic Lexer, AST Parser, and Style Tokenizer.
 */

const { DanpheLexer, TokenType, Token } = require('./DanpheLexer');
const { DanpheParser } = require('./DanpheParser');
const { DanpheCodeGenerator } = require('./DanpheCodeGenerator');
const { StyleTokenizer, PALETTE_MAP, FONT_SIZE_MAP, RADIUS_MAP, parseUnits, resolveColorAndShade } = require('./StyleTokenizer');
const ASTNodes = require('./ASTNodes');

function parse(source) {
  return DanpheParser.parse(source);
}

function tokenize(source) {
  const lexer = new DanpheLexer(source);
  return lexer.tokenize();
}

function tokenizeStyles(className) {
  return StyleTokenizer.tokenizeClasses(className);
}

module.exports = {
  DanpheLexer,
  DanpheParser,
  DanpheCodeGenerator,
  StyleTokenizer,
  TokenType,
  Token,
  parse,
  tokenize,
  tokenizeStyles,
  PALETTE_MAP,
  FONT_SIZE_MAP,
  RADIUS_MAP,
  parseUnits,
  resolveColorAndShade,
  ...ASTNodes
};
