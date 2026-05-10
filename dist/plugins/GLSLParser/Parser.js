import { TokenType, tokenize } from './Lexer.js';

class Parser {
  tokens = [];
  sourceLines = [];
  not_eof() {
    return this.tokens[0].type != TokenType.EOF;
  }
  at(index = 0) {
    return this.tokens[index];
  }
  eat() {
    return this.tokens.shift();
  }
  error(message, token = this.at()) {
    const sourceLine = this.sourceLines[token.line - 1] || "";
    const pointer = `${" ".repeat(Math.max(0, token.column - 1))}^`;
    throw Error(
      `Parser Error: ${message}
at ${token.line}:${token.column}, got "${token.value}"
${sourceLine}
${pointer}`
    );
  }
  expect(type, err) {
    const prev = this.tokens.shift();
    if (!prev || prev.type != type) this.error(err, prev || this.at());
    return prev;
  }
  produceAST(sourceCode) {
    this.sourceLines = sourceCode.split(/\r?\n/);
    this.tokens = tokenize(sourceCode);
    const program = {
      kind: "Program",
      body: []
    };
    while (this.not_eof()) {
      program.body.push(this.parse_stmt());
    }
    return program;
  }
  parse_stmt() {
    switch (this.at().type) {
      case TokenType.Precision:
        if (this.at().value == "precision") return this.parse_precision_declaration();
        return this.parse_declaration();
      case TokenType.Qualifier:
      case TokenType.Type:
        return this.parse_declaration();
      case TokenType.Return:
        return this.parse_return_declaration();
      case TokenType.If:
        return this.parse_if_declaration();
      case TokenType.For:
        return this.parse_forloop_declaration();
      default: {
        const expr = this.parse_expr();
        this.expect(TokenType.Semicolon, "Expect semicolon after expression");
        return { kind: "ExpressionStatement", expression: expr };
      }
    }
  }
  parse_precision_declaration() {
    this.eat();
    const precision = this.expect(TokenType.Precision, "Expected GLSL precision name").value;
    const type = this.expect(TokenType.Type, "Expected type after precision").value;
    this.expect(TokenType.Semicolon, "Expected semicolon after precision declaration");
    return { kind: "PrecisionDeclaration", precision, type };
  }
  parse_declaration() {
    const qualifier = this.at().type == TokenType.Qualifier ? this.eat().value : void 0;
    if (this.at().type == TokenType.Precision) this.eat();
    const type = this.expect(TokenType.Type, "Expected declaration type").value;
    const identifier = this.expect(TokenType.Identifier, "Expected declaration identifier").value;
    if (!qualifier && this.at().type == TokenType.OpenParen) {
      return this.parse_fn_declaration(type, identifier);
    }
    const declarations = [this.parse_var_declaration(type, identifier, qualifier)];
    while (this.at().type == TokenType.Comma) {
      this.eat();
      const nextIdentifier = this.expect(TokenType.Identifier, "Expected declaration identifier").value;
      declarations.push(this.parse_var_declaration(type, nextIdentifier, qualifier));
    }
    this.expect(TokenType.Semicolon, "Expected semicolon after variable declaration");
    if (declarations.length == 1) return declarations[0];
    return { kind: "VarDeclarationList", declarations };
  }
  parse_fn_declaration(type, name) {
    const args = this.parse_args();
    const params = [];
    for (const arg of args) {
      if (arg.kind != "VarDeclaration") throw Error("Expected function parameter declaration");
      params.push(arg);
    }
    const fn = {
      kind: "FunctionDeclaration",
      type,
      name,
      parameters: params,
      body: this.parse_block()
    };
    return fn;
  }
  parse_var_declaration(type, identifier, qualifier) {
    let arraySize;
    let value;
    if (this.at().type == TokenType.OpenBracket) {
      this.eat();
      if (this.at().type != TokenType.CloseBracket) arraySize = this.parse_expr();
      this.expect(TokenType.CloseBracket, "Expected array close bracket");
    }
    if (this.at().type == TokenType.Equals) {
      this.eat();
      value = this.parse_expr();
    }
    return {
      kind: "VarDeclaration",
      qualifier,
      type,
      identifier,
      value,
      arraySize
    };
  }
  parse_return_declaration() {
    this.eat();
    const declaration = {
      kind: "ReturnDeclaration",
      value: this.at().type == TokenType.Semicolon ? void 0 : this.parse_expr()
    };
    this.expect(TokenType.Semicolon, "Expected semicolon after return");
    return declaration;
  }
  parse_if_declaration() {
    this.eat();
    this.expect(TokenType.OpenParen, "Expected open paren after if");
    const test = this.parse_expr();
    this.expect(TokenType.CloseParen, "Expected close paren after if test");
    const body = this.parse_stmt_or_block();
    const alternate = this.at().type == TokenType.Else ? (this.eat(), this.parse_stmt_or_block()) : void 0;
    return { kind: "ConditionalDeclaration", test, body, alternate };
  }
  parse_forloop_declaration() {
    this.eat();
    this.expect(TokenType.OpenParen, "Expected open paren after for");
    let init;
    if (this.at().type != TokenType.Semicolon) {
      init = this.at().type == TokenType.Type ? this.parse_declaration_header() : this.parse_expr();
    }
    this.expect(TokenType.Semicolon, "Expected semicolon after for init");
    const condition = this.at().type == TokenType.Semicolon ? void 0 : this.parse_expr();
    this.expect(TokenType.Semicolon, "Expected semicolon after for condition");
    const increment = this.at().type == TokenType.CloseParen ? void 0 : this.parse_expr();
    this.expect(TokenType.CloseParen, "Expected close paren after for");
    return {
      kind: "ForLoopDeclaration",
      init,
      condition,
      increment,
      body: this.parse_block()
    };
  }
  parse_declaration_header() {
    const type = this.eat().value;
    const identifier = this.expect(TokenType.Identifier, "Expected declaration identifier").value;
    return this.parse_var_declaration(type, identifier);
  }
  parse_block() {
    this.expect(TokenType.OpenBrace, "Expected open brace");
    const body = [];
    while (this.at().type != TokenType.EOF && this.at().type != TokenType.CloseBrace) {
      body.push(this.parse_stmt());
    }
    this.expect(TokenType.CloseBrace, "Expected closing brace");
    return body;
  }
  parse_stmt_or_block() {
    if (this.at().type == TokenType.OpenBrace) return this.parse_block();
    return [this.parse_stmt()];
  }
  parse_expr() {
    return this.parse_assignment_expr();
  }
  parse_assignment_expr() {
    const left = this.parse_conditional_expr();
    if (this.at().type == TokenType.Equals || this.at().type == TokenType.AssignmentOperator) {
      const operator = this.eat().value;
      const value = this.parse_assignment_expr();
      return { kind: "AssignmentExpr", assigne: left, value, operator };
    }
    return left;
  }
  parse_conditional_expr() {
    const test = this.parse_logical_expr();
    if (this.at().type != TokenType.Question) return test;
    this.eat();
    const consequent = this.parse_expr();
    this.expect(TokenType.Colon, "Expected colon in conditional expression");
    const alternate = this.parse_assignment_expr();
    return { kind: "ConditionalExpr", test, consequent, alternate };
  }
  parse_logical_expr() {
    let left = this.parse_equality_expr();
    while (this.at().type == TokenType.LogicalOperator) {
      const operator = this.eat().value;
      left = this.parse_binary_expr(left, this.parse_equality_expr(), operator);
    }
    return left;
  }
  parse_equality_expr() {
    let left = this.parse_relational_expr();
    while (this.at().type == TokenType.EqualityOperator) {
      const operator = this.eat().value;
      left = this.parse_binary_expr(left, this.parse_relational_expr(), operator);
    }
    return left;
  }
  parse_relational_expr() {
    let left = this.parse_additive_expr();
    while (this.at().type == TokenType.RelationalOperator) {
      const operator = this.eat().value;
      left = this.parse_binary_expr(left, this.parse_additive_expr(), operator);
    }
    return left;
  }
  parse_additive_expr() {
    let left = this.parse_multiplicative_expr();
    while (this.at().value == "+" || this.at().value == "-") {
      const operator = this.eat().value;
      left = this.parse_binary_expr(left, this.parse_multiplicative_expr(), operator);
    }
    return left;
  }
  parse_multiplicative_expr() {
    let left = this.parse_unary_expr();
    while (this.at().value == "*" || this.at().value == "/" || this.at().value == "%") {
      const operator = this.eat().value;
      left = this.parse_binary_expr(left, this.parse_unary_expr(), operator);
    }
    return left;
  }
  parse_binary_expr(left, right, operator) {
    return { kind: "BinaryExpr", left, right, operator };
  }
  parse_unary_expr() {
    if (this.at().type == TokenType.UnaryOperator || this.at().value == "-" || this.at().value == "+") {
      const operator = this.eat().value;
      return { kind: "UnaryExpr", operand: this.parse_unary_expr(), operator, prefix: true };
    }
    let expr = this.parse_call_member_expr();
    while (this.at().type == TokenType.UnaryOperator) {
      expr = { kind: "UnaryExpr", operand: expr, operator: this.eat().value, prefix: false };
    }
    return expr;
  }
  parse_call_member_expr() {
    let expr = this.parse_primary_expr();
    while (this.at().type == TokenType.OpenParen || this.at().type == TokenType.Dot || this.at().type == TokenType.OpenBracket) {
      if (this.at().type == TokenType.OpenParen) {
        expr = { kind: "CallExpr", caller: expr, args: this.parse_args() };
      } else if (this.at().type == TokenType.Dot) {
        this.eat();
        expr = {
          kind: "MemberExpr",
          object: expr,
          property: { kind: "Identifier", symbol: this.expect(TokenType.Identifier, "Expected member name").value }
        };
      } else {
        this.eat();
        expr = { kind: "IndexExpr", object: expr, index: this.parse_expr() };
        this.expect(TokenType.CloseBracket, "Expected close bracket");
      }
    }
    return expr;
  }
  parse_args() {
    this.expect(TokenType.OpenParen, "Expected open parenthesis");
    if (this.at().type == TokenType.Type && this.at().value == "void" && this.at(1).type == TokenType.CloseParen) {
      this.eat();
      this.expect(TokenType.CloseParen, "Missing closing parenthesis inside arguments list");
      return [];
    }
    const args = this.at().type == TokenType.CloseParen ? [] : this.parse_arguments_list();
    this.expect(TokenType.CloseParen, "Missing closing parenthesis inside arguments list");
    return args;
  }
  parse_arguments_list() {
    const args = [this.parse_argument()];
    while (this.at().type == TokenType.Comma && this.eat()) args.push(this.parse_argument());
    return args;
  }
  parse_argument() {
    if (this.at().type == TokenType.Qualifier) {
      const qualifier = this.eat().value;
      const type = this.expect(TokenType.Type, "Expected parameter type").value;
      const identifier = this.expect(TokenType.Identifier, "Expected parameter identifier").value;
      return this.parse_var_declaration(type, identifier, qualifier);
    }
    if (this.at().type == TokenType.Type && this.at(1).type == TokenType.Identifier) {
      const type = this.eat().value;
      const identifier = this.eat().value;
      return this.parse_var_declaration(type, identifier);
    }
    return this.parse_assignment_expr();
  }
  parse_primary_expr() {
    switch (this.at().type) {
      case TokenType.Identifier:
      case TokenType.Type:
        return { kind: "Identifier", symbol: this.eat().value };
      case TokenType.Number:
        return { kind: "NumericLiteral", value: this.eat().value };
      case TokenType.Bool:
        return { kind: "BooleanLiteral", value: this.eat().value == "true" };
      case TokenType.OpenParen: {
        this.eat();
        const value = this.parse_expr();
        this.expect(TokenType.CloseParen, "Expected closing parenthesis");
        return value;
      }
      default:
        this.error("Unexpected token found during parsing");
    }
  }
}

export { Parser };
