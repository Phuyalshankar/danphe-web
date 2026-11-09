'use strict';

/**
 * 🏔️ COMPREHENSIVE TEST SUITE: Danphe Lexer, Parser, CodeGenerator & StyleTokenizer
 * Verifies the complete 4-layer modular world-class compiler pipeline for Danphe.
 */

const {
  DanpheLexer,
  DanpheParser,
  DanpheCodeGenerator,
  StyleTokenizer,
  TokenType
} = require('../src/parser');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🏛️ RUNNING TEST: Danphe Modular Lexer, Parser & CodeGenerator Pipeline');
  console.log('═══════════════════════════════════════════════════════════════════');

  // ─────────────────────────────────────────────────────────────────
  // 1. LEXER TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[TEST GROUP 1] DanpheLexer Tokenization & Unicode Support');

  const source1 = `
    // Nepali Register Declaration & Unicode Test
    reg userProfile:: नाम, इमेल, फोन;
    export default function सागरमाथाView(props) {
      return (
        <div class="p-4 bg-everest fx-crystal" data-active={true} {...props}>
          <h1 title="सगरमाथा 🏔️">नेपाली रियाक्ट इन्जिन</h1>
          <button onClick={() => alert("सफलता")}>क्लिक गर्नुहोस्</button>
        </div>
      );
    }
  `;

  const lexer1 = new DanpheLexer(source1);
  const tokens1 = lexer1.tokenize();

  assert(tokens1.length > 20, 'Lexer produced full token stream');
  assert(tokens1.some(t => t.type === TokenType.KEYWORD && t.value === 'reg'), 'Recognized keyword "reg"');
  assert(tokens1.some(t => t.type === TokenType.COLONCOLON && t.value === '::'), 'Recognized token "::"');
  assert(tokens1.some(t => t.value === 'नाम'), 'Recognized Devanagari identifier "नाम"');
  assert(tokens1.some(t => t.value === 'इमेल'), 'Recognized Devanagari identifier "इमेल"');
  assert(tokens1.some(t => t.value === 'सागरमाथाView'), 'Recognized component name with Devanagari prefix');
  assert(tokens1.some(t => t.type === TokenType.ELLIPSIS && t.value === '...'), 'Recognized spread operator "..."');
  assert(tokens1.some(t => t.type === TokenType.ARROW && t.value === '=>'), 'Recognized arrow operator "=>"');

  // ─────────────────────────────────────────────────────────────────
  // 2. PARSER AST TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[TEST GROUP 2] DanpheParser AST Construction');

  const source2 = `
    reg accountForm:: fullName, email, balance;

    export default function BankCard(props) {
      return (
        <TitanCard title="खाता विवरण" theme="everest" {...props}>
          <div class="flex-col gap-2">
            <span>नाम: {accountForm.fullName}</span>
            <span>इमेल: {accountForm.email}</span>
            <span>स्थिति: {accountForm.balance > 0 ? "सक्रिय" : "शून्य"}</span>
          </div>
        </TitanCard>
      );
    }
  `;

  const ast2 = DanpheParser.parse(source2);

  assert(ast2 && ast2.type === 'Program', 'AST Program root node created');
  assert(ast2.body.length === 2, 'Program contains 2 top-level statements (RegDecl + ExportFunction)');

  // Validate Register Declaration Node
  const regNode = ast2.body[0];
  assert(regNode.type === 'RegisterDeclaration', 'First statement is RegisterDeclarationNode');
  assert(regNode.id === 'accountForm', 'Register ID matches "accountForm"');
  assert(regNode.fields.length === 3 && regNode.fields[1] === 'email', 'Register fields parsed accurately');

  // Validate Function Declaration Node
  const fnNode = ast2.body[1];
  assert(fnNode.type === 'FunctionDeclaration', 'Second statement is FunctionDeclarationNode');
  assert(fnNode.id === 'BankCard', 'Function name matches "BankCard"');
  assert(fnNode.isExported === true && fnNode.isDefault === true, 'Function flagged as export default');

  // Validate JSX inside function body
  const retStmt = fnNode.body[0];
  assert(retStmt.type === 'ReturnStatement', 'Function body contains ReturnStatementNode');
  const rootJsx = retStmt.argument;
  assert(rootJsx.type === 'JSXElement' && rootJsx.tag === 'TitanCard', 'Return argument is TitanCard JSXElement');
  assert(rootJsx.props.title.value === 'खाता विवरण', 'JSX prop "title" parsed cleanly with Devanagari string');
  assert(Boolean(rootJsx.props.__spread_2), 'Spread prop {...props} parsed as JSXSpreadAttributeNode');

  // Validate nested conditional ternary expression
  const cardChildren = rootJsx.children;
  assert(cardChildren.length === 1, 'TitanCard has 1 child (div)');
  const divChildren = cardChildren[0].children;
  assert(divChildren.length === 3, 'div has 3 span children');

  const span3 = divChildren[2];
  const exprNode = span3.children[1].expression;
  assert(exprNode.type === 'ConditionalExpression', 'Ternary condition parsed into ConditionalExpressionNode');
  assert(exprNode.test.operator === '>', 'Conditional test uses binary operator ">"');
  assert(exprNode.consequent.value === 'सक्रिय', 'Consequent matches "सक्रिय"');

  // ─────────────────────────────────────────────────────────────────
  // 3. CODE GENERATOR TESTS (Web JS, HTML, Dolphin IR)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[TEST GROUP 3] DanpheCodeGenerator Multi-Target Code Generation');

  // 3.1 Web JS Output
  const webJS = DanpheCodeGenerator.toWebJS(ast2);
  assert(typeof webJS === 'string' && webJS.length > 0, 'Generated Web JS code');
  assert(webJS.includes('TitanRegisters') && webJS.includes('accountForm'), 'Web JS contains registered form initialization');
  assert(webJS.includes('title: "खाता विवरण"') && webJS.includes('h('), 'Web JS correctly uses h() factory');
  assert(webJS.includes('module.exports = BankCard;'), 'Web JS includes default export assignment');

  // Test executing generated JS in sandbox
  let executionSuccess = false;
  try {
    const sandboxScope = {
      h: (tag, props, ...children) => ({ tag, props, children }),
      TitanRegisters: { reg: (dsl) => ({ dsl, slots: {} }) },
      module: { exports: {} },
      exports: {}
    };
    const fn = new Function('h', 'TitanRegisters', 'module', 'exports', webJS);
    fn(sandboxScope.h, sandboxScope.TitanRegisters, sandboxScope.module, sandboxScope.exports);
    const exportedFn = sandboxScope.module.exports;
    const vnodeResult = exportedFn({ customProp: 123 });
    assert(vnodeResult && vnodeResult.tag === 'TitanCard', 'Generated Web JS executed cleanly and returned valid VNode');
    executionSuccess = true;
  } catch (err) {
    console.error('Execution error:', err);
  }
  assert(executionSuccess, 'Generated Web JS is 100% syntactically valid and executable');

  // 3.2 HTML Static SSR Output
  const simpleJSX = DanpheParser.parse(`
    <div class="card p-4 bg-everest" id="main">
      <h1>सगरमाथा हिमाल</h1>
      <p class="text-sm">विश्वको सर्वोच्च शिखर</p>
      <input type="text" disabled />
    </div>
  `);
  const htmlOutput = DanpheCodeGenerator.toHTML(simpleJSX);
  assert(htmlOutput.includes('<div class="card p-4 bg-everest" id="main">'), 'HTML SSR rendered wrapper tag with classes');
  assert(htmlOutput.includes('<h1>सगरमाथा हिमाल</h1>'), 'HTML SSR rendered Devanagari heading');
  assert(htmlOutput.includes('<input type="text" disabled="true" />'), 'HTML SSR rendered self-closing input');

  // 3.3 Dolphin IR Output
  const dolphinIR = DanpheCodeGenerator.toDolphinIR(simpleJSX);
  assert(dolphinIR && dolphinIR.type === 'DolphinApp', 'Dolphin IR root node generated');
  assert(dolphinIR.children[0].tag === 'div', 'Dolphin IR contains root div node');

  // ─────────────────────────────────────────────────────────────────
  // 4. STYLE TOKENIZER TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[TEST GROUP 4] StyleTokenizer DolphinCSS Analysis');

  const styles = StyleTokenizer.tokenizeClasses('p-4 bg-everest fx-crystal flex-col gap-2 rounded-lg text-white font-bold');
  assert(styles.padding.top === 16 && styles.padding.left === 16, 'Padding p-4 parsed to 16px');
  assert(styles.layout.direction === 1, 'flex-col parsed to vertical direction (1)');
  assert(styles.layout.gap === 8, 'gap-2 parsed to 8px');
  assert(styles.border.radius === 8, 'rounded-lg parsed to 8px radius');
  assert(styles.text.weight === 700, 'font-bold parsed to weight 700');
  assert(styles.fx && styles.fx.includes('fx-crystal'), 'fx-crystal Special FX variant detected');
  assert(styles.fx && styles.fx.includes('bg-everest'), 'bg-everest Mount Everest preset detected');

  // ─────────────────────────────────────────────────────────────────
  // 5. ERROR DIAGNOSTIC TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[TEST GROUP 5] Precise Line/Col Syntax Error Reporting');

  let caughtError = false;
  try {
    const invalidSource = `
      function BadApp() {
        return (
          <div>
            <span>अपूर्ण ट्याग
          </div>
        );
      }
    `;
    DanpheParser.parse(invalidSource);
  } catch (err) {
    caughtError = true;
    assert(err.message.includes('Mismatched closing tag'), 'Detected mismatched tag error');
    assert(err.message.includes('line'), 'Error message contains precise line number');
  }
  assert(caughtError, 'Parser safely trapped syntax error without uncaught crash');

  // ─────────────────────────────────────────────────────────────────
  // 6. ENHANCED PARSER AUDIT VERIFICATION (Operator Precedence, Dotted Tags, Multi-Param Arrows)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[TEST GROUP 6] Enhanced Parser Fixes Verification');

  // 6.1 Operator Precedence Test: a + b * c
  const precAst = DanpheParser.parse(`
    function Calc() {
      return (
        <div>{a + b * c}</div>
      );
    }
  `);
  const precExpr = precAst.body[0].body[0].argument.children[0].expression;
  assert(precExpr.type === 'BinaryExpression' && precExpr.operator === '+', 'Top level operator of (a + b * c) is +');
  assert(precExpr.right.type === 'BinaryExpression' && precExpr.right.operator === '*', 'Right operand is (b * c) with higher precedence');

  // 6.2 Multi-Parameter Arrow Function: (x, y) => x + y
  const arrowAst = DanpheParser.parse(`
    function Handler() {
      return (
        <button onClick={(x, y) => x + y}>Add</button>
      );
    }
  `);
  const arrowExpr = arrowAst.body[0].body[0].argument.props.onClick;
  assert(arrowExpr.type === 'ArrowFunctionExpression', 'Parsed ArrowFunctionExpression with multiple params');
  assert(arrowExpr.params.length === 2 && arrowExpr.params[0] === 'x' && arrowExpr.params[1] === 'y', 'Both parameters [x, y] captured');

  // 6.3 Dotted Component Tag: <Everest.Card />
  const dottedAst = DanpheParser.parse(`
    <Everest.Card title="Mount Everest">
      <span>8848.86m</span>
    </Everest.Card>
  `);
  const dottedElem = dottedAst.body[0];
  assert(dottedElem.tag === 'Everest.Card', 'Dotted JSX tag "Everest.Card" correctly parsed');

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
