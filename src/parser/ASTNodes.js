'use strict';

/**
 * 🏛️ DANPHE AST NODES (ASTNodes.js)
 * Formal Abstract Syntax Tree definitions for Danphe-Native & Titan-OS.
 */

class ASTNode {
  constructor(type, loc = null) {
    this.type = type;
    this.loc = loc;
  }
}

class ProgramNode extends ASTNode {
  constructor(body = [], loc = null) {
    super('Program', loc);
    this.body = body;
  }
}

class RegisterDeclarationNode extends ASTNode {
  constructor(id, fields = [], loc = null) {
    super('RegisterDeclaration', loc);
    this.id = id;
    this.fields = fields; // Array of strings: ['fullName', 'email', 'phone']
  }
}

class JSXElementNode extends ASTNode {
  constructor(tag, props = {}, children = [], loc = null) {
    super('JSXElement', loc);
    this.tag = tag;
    this.props = props;
    this.children = children;
  }
}

class JSXTextNode extends ASTNode {
  constructor(value, loc = null) {
    super('JSXText', loc);
    this.value = value;
  }
}

class JSXExpressionNode extends ASTNode {
  constructor(expression, loc = null) {
    super('JSXExpression', loc);
    this.expression = expression;
  }
}

class MemberExpressionNode extends ASTNode {
  constructor(object, property, loc = null) {
    super('MemberExpression', loc);
    this.object = object;
    this.property = property;
  }
}

class IdentifierNode extends ASTNode {
  constructor(name, loc = null) {
    super('Identifier', loc);
    this.name = name;
  }
}

class LiteralNode extends ASTNode {
  constructor(value, raw = '', loc = null) {
    super('Literal', loc);
    this.value = value;
    this.raw = raw;
  }
}

module.exports = {
  ASTNode,
  ProgramNode,
  RegisterDeclarationNode,
  JSXElementNode,
  JSXTextNode,
  JSXExpressionNode,
  MemberExpressionNode,
  IdentifierNode,
  LiteralNode
};
