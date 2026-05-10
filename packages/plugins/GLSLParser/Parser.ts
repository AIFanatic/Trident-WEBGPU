import {
    AssignmentExpr,
    BinaryExpr,
    BooleanLiteral,
    CallExpr,
    ConditionalExpr,
    ConditionalDeclaration,
    Expr,
    ExpressionStatement,
    ForLoopDeclaration,
    FunctionDeclaration,
    Identifier,
    IndexExpr,
    MemberExpr,
    NumericLiteral,
    PrecisionDeclaration,
    Program,
    ReturnDeclaration,
    Stmt,
    UnaryExpr,
    VarDeclaration,
    VarDeclarationList,
} from "./AST";
import { Token, tokenize, TokenType } from "./Lexer";

export class Parser {
    private tokens: Token[] = [];
    private sourceLines: string[] = [];

    private not_eof(): boolean {
        return this.tokens[0].type != TokenType.EOF;
    }

    private at(index: number = 0) {
        return this.tokens[index] as Token;
    }

    private eat() {
        return this.tokens.shift() as Token;
    }

    private error(message: string, token: Token = this.at()) {
        const sourceLine = this.sourceLines[token.line - 1] || "";
        const pointer = `${" ".repeat(Math.max(0, token.column - 1))}^`;
        throw Error(
            `Parser Error: ${message}\n` +
            `at ${token.line}:${token.column}, got "${token.value}"\n` +
            `${sourceLine}\n${pointer}`
        );
    }

    private expect(type: TokenType, err: string) {
        const prev = this.tokens.shift() as Token;
        if (!prev || prev.type != type) this.error(err, prev || this.at());
        return prev;
    }

    public produceAST(sourceCode: string): Program {
        this.sourceLines = sourceCode.split(/\r?\n/);
        this.tokens = tokenize(sourceCode);
        const program: Program = {
            kind: "Program",
            body: [],
        };

        while (this.not_eof()) {
            program.body.push(this.parse_stmt());
        }

        return program;
    }

    private parse_stmt(): Stmt {
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
                return { kind: "ExpressionStatement", expression: expr } as ExpressionStatement;
            }
        }
    }

    private parse_precision_declaration(): Stmt {
        this.eat();
        const precision = this.expect(TokenType.Precision, "Expected GLSL precision name").value;
        const type = this.expect(TokenType.Type, "Expected type after precision").value;
        this.expect(TokenType.Semicolon, "Expected semicolon after precision declaration");
        return { kind: "PrecisionDeclaration", precision, type } as PrecisionDeclaration;
    }

    private parse_declaration(): Stmt {
        const qualifier = this.at().type == TokenType.Qualifier ? this.eat().value : undefined;
        if (this.at().type == TokenType.Precision) this.eat();

        const type = this.expect(TokenType.Type, "Expected declaration type").value;
        const identifier = this.expect(TokenType.Identifier, "Expected declaration identifier").value;

        if (!qualifier && this.at().type == TokenType.OpenParen) {
            return this.parse_fn_declaration(type, identifier);
        }

        const declarations = [this.parse_var_declaration(type, identifier, qualifier) as VarDeclaration];
        while (this.at().type == TokenType.Comma) {
            this.eat();
            const nextIdentifier = this.expect(TokenType.Identifier, "Expected declaration identifier").value;
            declarations.push(this.parse_var_declaration(type, nextIdentifier, qualifier) as VarDeclaration);
        }

        this.expect(TokenType.Semicolon, "Expected semicolon after variable declaration");
        if (declarations.length == 1) return declarations[0];
        return { kind: "VarDeclarationList", declarations } as VarDeclarationList;
    }

    private parse_fn_declaration(type: string, name: string): Stmt {
        const args = this.parse_args();
        const params: VarDeclaration[] = [];

        for (const arg of args) {
            if (arg.kind != "VarDeclaration") throw Error("Expected function parameter declaration");
            params.push(arg as VarDeclaration);
        }

        const fn: FunctionDeclaration = {
            kind: "FunctionDeclaration",
            type,
            name,
            parameters: params,
            body: this.parse_block(),
        };

        return fn;
    }

    private parse_var_declaration(type: string, identifier: string, qualifier?: string): Stmt {
        let arraySize: Expr | undefined;
        let value: Expr | undefined;

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
            arraySize,
        } as VarDeclaration;
    }

    private parse_return_declaration(): Stmt {
        this.eat();
        const declaration: ReturnDeclaration = {
            kind: "ReturnDeclaration",
            value: this.at().type == TokenType.Semicolon ? undefined : this.parse_expr(),
        };
        this.expect(TokenType.Semicolon, "Expected semicolon after return");
        return declaration;
    }

    private parse_if_declaration(): Stmt {
        this.eat();
        this.expect(TokenType.OpenParen, "Expected open paren after if");
        const test = this.parse_expr();
        this.expect(TokenType.CloseParen, "Expected close paren after if test");

        const body = this.parse_stmt_or_block();
        const alternate = this.at().type == TokenType.Else ? (this.eat(), this.parse_stmt_or_block()) : undefined;

        return { kind: "ConditionalDeclaration", test, body, alternate } as ConditionalDeclaration;
    }

    private parse_forloop_declaration(): Stmt {
        this.eat();
        this.expect(TokenType.OpenParen, "Expected open paren after for");

        let init: Stmt | undefined;
        if (this.at().type != TokenType.Semicolon) {
            init = this.at().type == TokenType.Type ? this.parse_declaration_header() : this.parse_expr();
        }
        this.expect(TokenType.Semicolon, "Expected semicolon after for init");

        const condition = this.at().type == TokenType.Semicolon ? undefined : this.parse_expr();
        this.expect(TokenType.Semicolon, "Expected semicolon after for condition");

        const increment = this.at().type == TokenType.CloseParen ? undefined : this.parse_expr();
        this.expect(TokenType.CloseParen, "Expected close paren after for");

        return {
            kind: "ForLoopDeclaration",
            init,
            condition,
            increment,
            body: this.parse_block(),
        } as ForLoopDeclaration;
    }

    private parse_declaration_header(): Stmt {
        const type = this.eat().value;
        const identifier = this.expect(TokenType.Identifier, "Expected declaration identifier").value;
        return this.parse_var_declaration(type, identifier);
    }

    private parse_block(): Stmt[] {
        this.expect(TokenType.OpenBrace, "Expected open brace");
        const body: Stmt[] = [];

        while (this.at().type != TokenType.EOF && this.at().type != TokenType.CloseBrace) {
            body.push(this.parse_stmt());
        }

        this.expect(TokenType.CloseBrace, "Expected closing brace");
        return body;
    }

    private parse_stmt_or_block(): Stmt[] {
        if (this.at().type == TokenType.OpenBrace) return this.parse_block();
        return [this.parse_stmt()];
    }

    private parse_expr(): Expr {
        return this.parse_assignment_expr();
    }

    private parse_assignment_expr(): Expr {
        const left = this.parse_conditional_expr();
        if (this.at().type == TokenType.Equals || this.at().type == TokenType.AssignmentOperator) {
            const operator = this.eat().value;
            const value = this.parse_assignment_expr();
            return { kind: "AssignmentExpr", assigne: left, value, operator } as AssignmentExpr;
        }

        return left;
    }

    private parse_conditional_expr(): Expr {
        const test = this.parse_logical_expr();
        if (this.at().type != TokenType.Question) return test;

        this.eat();
        const consequent = this.parse_expr();
        this.expect(TokenType.Colon, "Expected colon in conditional expression");
        const alternate = this.parse_assignment_expr();
        return { kind: "ConditionalExpr", test, consequent, alternate } as ConditionalExpr;
    }

    private parse_logical_expr(): Expr {
        let left = this.parse_equality_expr();
        while (this.at().type == TokenType.LogicalOperator) {
            const operator = this.eat().value;
            left = this.parse_binary_expr(left, this.parse_equality_expr(), operator);
        }
        return left;
    }

    private parse_equality_expr(): Expr {
        let left = this.parse_relational_expr();
        while (this.at().type == TokenType.EqualityOperator) {
            const operator = this.eat().value;
            left = this.parse_binary_expr(left, this.parse_relational_expr(), operator);
        }
        return left;
    }

    private parse_relational_expr(): Expr {
        let left = this.parse_additive_expr();
        while (this.at().type == TokenType.RelationalOperator) {
            const operator = this.eat().value;
            left = this.parse_binary_expr(left, this.parse_additive_expr(), operator);
        }
        return left;
    }

    private parse_additive_expr(): Expr {
        let left = this.parse_multiplicative_expr();
        while (this.at().value == "+" || this.at().value == "-") {
            const operator = this.eat().value;
            left = this.parse_binary_expr(left, this.parse_multiplicative_expr(), operator);
        }
        return left;
    }

    private parse_multiplicative_expr(): Expr {
        let left = this.parse_unary_expr();
        while (this.at().value == "*" || this.at().value == "/" || this.at().value == "%") {
            const operator = this.eat().value;
            left = this.parse_binary_expr(left, this.parse_unary_expr(), operator);
        }
        return left;
    }

    private parse_binary_expr(left: Expr, right: Expr, operator: string): Expr {
        return { kind: "BinaryExpr", left, right, operator } as BinaryExpr;
    }

    private parse_unary_expr(): Expr {
        if (this.at().type == TokenType.UnaryOperator || this.at().value == "-" || this.at().value == "+") {
            const operator = this.eat().value;
            return { kind: "UnaryExpr", operand: this.parse_unary_expr(), operator, prefix: true } as UnaryExpr;
        }

        let expr = this.parse_call_member_expr();
        while (this.at().type == TokenType.UnaryOperator) {
            expr = { kind: "UnaryExpr", operand: expr, operator: this.eat().value, prefix: false } as UnaryExpr;
        }
        return expr;
    }

    private parse_call_member_expr(): Expr {
        let expr = this.parse_primary_expr();

        while (this.at().type == TokenType.OpenParen || this.at().type == TokenType.Dot || this.at().type == TokenType.OpenBracket) {
            if (this.at().type == TokenType.OpenParen) {
                expr = { kind: "CallExpr", caller: expr, args: this.parse_args() } as CallExpr;
            }
            else if (this.at().type == TokenType.Dot) {
                this.eat();
                expr = {
                    kind: "MemberExpr",
                    object: expr,
                    property: { kind: "Identifier", symbol: this.expect(TokenType.Identifier, "Expected member name").value },
                } as MemberExpr;
            }
            else {
                this.eat();
                expr = { kind: "IndexExpr", object: expr, index: this.parse_expr() } as IndexExpr;
                this.expect(TokenType.CloseBracket, "Expected close bracket");
            }
        }

        return expr;
    }

    private parse_args(): Expr[] {
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

    private parse_arguments_list(): Expr[] {
        const args = [this.parse_argument()];
        while (this.at().type == TokenType.Comma && this.eat()) args.push(this.parse_argument());
        return args;
    }

    private parse_argument(): Expr {
        if (this.at().type == TokenType.Qualifier) {
            const qualifier = this.eat().value;
            const type = this.expect(TokenType.Type, "Expected parameter type").value;
            const identifier = this.expect(TokenType.Identifier, "Expected parameter identifier").value;
            return this.parse_var_declaration(type, identifier, qualifier) as VarDeclaration;
        }

        if (this.at().type == TokenType.Type && this.at(1).type == TokenType.Identifier) {
            const type = this.eat().value;
            const identifier = this.eat().value;
            return this.parse_var_declaration(type, identifier) as VarDeclaration;
        }

        return this.parse_assignment_expr();
    }

    private parse_primary_expr(): Expr {
        switch (this.at().type) {
            case TokenType.Identifier:
            case TokenType.Type:
                return { kind: "Identifier", symbol: this.eat().value } as Identifier;
            case TokenType.Number:
                return { kind: "NumericLiteral", value: this.eat().value } as NumericLiteral;
            case TokenType.Bool:
                return { kind: "BooleanLiteral", value: this.eat().value == "true" } as BooleanLiteral;
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
