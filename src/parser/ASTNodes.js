'use strict';

/**
 * 🏛️ DANPHE AST NODES (ASTNodes.js)
 * Formal Abstract Syntax Tree definitions for Danphe-Native, Titan-Bus & Danphe-Web.
 * Modular, typed node definitions representing full components, register DSL, and JSX.
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

class FunctionDeclarationNode extends ASTNode {
  constructor(id, params = [], body = [], isExported = false, isDefault = false, loc = null) {
    super('FunctionDeclaration', loc);
    this.id = id;
    this.params = params;
    this.body = body;
    this.isExported = isExported;
    this.isDefault = isDefault;
  }
}

class ReturnStatementNode extends ASTNode {
  constructor(argument = null, loc = null) {
    super('ReturnStatement', loc);
    this.argument = argument;
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

class JSXFragmentNode extends ASTNode {
  constructor(children = [], loc = null) {
    super('JSXFragment', loc);
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

class JSXSpreadAttributeNode extends ASTNode {
  constructor(argument, loc = null) {
    super('JSXSpreadAttribute', loc);
    this.argument = argument;
  }
}

class MemberExpressionNode extends ASTNode {
  constructor(object, property, computed = false, loc = null) {
    super('MemberExpression', loc);
    this.object = object;
    this.property = property;
    this.computed = computed;
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

class CallExpressionNode extends ASTNode {
  constructor(callee, args = [], loc = null) {
    super('CallExpression', loc);
    this.callee = callee;
    this.args = args;
  }
}

class BinaryExpressionNode extends ASTNode {
  constructor(operator, left, right, loc = null) {
    super('BinaryExpression', loc);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

class UnaryExpressionNode extends ASTNode {
  constructor(operator, argument, prefix = true, loc = null) {
    super('UnaryExpression', loc);
    this.operator = operator;
    this.argument = argument;
    this.prefix = prefix;
  }
}

class ConditionalExpressionNode extends ASTNode {
  constructor(test, consequent, alternate, loc = null) {
    super('ConditionalExpression', loc);
    this.test = test;
    this.consequent = consequent;
    this.alternate = alternate;
  }
}

class ArrowFunctionExpressionNode extends ASTNode {
  constructor(params = [], body = null, loc = null) {
    super('ArrowFunctionExpression', loc);
    this.params = params;
    this.body = body;
  }
}

class ObjectExpressionNode extends ASTNode {
  constructor(properties = [], loc = null) {
    super('ObjectExpression', loc);
    this.properties = properties;
  }
}

class PropertyNode extends ASTNode {
  constructor(key, value, loc = null) {
    super('Property', loc);
    this.key = key;
    this.value = value;
  }
}

class ArrayExpressionNode extends ASTNode {
  constructor(elements = [], loc = null) {
    super('ArrayExpression', loc);
    this.elements = elements;
  }
}

module.exports = {
  ASTNode,
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
};
