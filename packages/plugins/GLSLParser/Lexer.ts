export enum TokenType {
    Number,
    Identifier,
    Type,
    Precision,
    Qualifier,
    Return,
    If,
    Else,
    For,
    Bool,
    UnaryOperator,
    BinaryOperator,
    RelationalOperator,
    EqualityOperator,
    LogicalOperator,
    AssignmentOperator,
    Equals,
    Question,
    Colon,
    Comma,
    Dot,
    Semicolon,
    OpenParen,
    CloseParen,
    OpenBrace,
    CloseBrace,
    OpenBracket,
    CloseBracket,
    EOF,
}

const TYPES = new Set([
    "void", "bool", "int", "uint", "float",
    "vec2", "vec3", "vec4",
    "ivec2", "ivec3", "ivec4",
    "uvec2", "uvec3", "uvec4",
    "bvec2", "bvec3", "bvec4",
    "mat2", "mat3", "mat4",
    "sampler2D", "samplerCube",
]);

const QUALIFIERS = new Set([
    "uniform", "attribute", "varying", "in", "out", "inout", "const",
]);

const PRECISION = new Set(["precision", "lowp", "mediump", "highp"]);

export interface Token {
    value: string;
    type: TokenType;
    line: number;
    column: number;
}

function token(value: string, type: TokenType, line: number, column: number): Token {
    return { value, type, line, column };
}

function isword(str: string) {
    return /^[a-zA-Z0-9_]+$/.test(str);
}

function isint(str: string) {
    const c = str.charCodeAt(0);
    return c >= 48 && c <= 57;
}

function isskippable(str: string) {
    return str == " " || str == "\n" || str == "\t" || str == "\r";
}

function readWhile(peek: () => string, take: () => string, test: (value: string) => boolean) {
    let value = "";
    while (peek() && test(peek())) value += take();
    return value;
}

export function tokenize(sourceCode: string): Token[] {
    const tokens = new Array<Token>();
    let cursor = 0;
    let line = 1;
    let column = 1;

    function peek(offset = 0) {
        return sourceCode[cursor + offset] || "";
    }

    function take() {
        const value = sourceCode[cursor++] || "";
        if (value == "\n") {
            line++;
            column = 1;
        }
        else {
            column++;
        }
        return value;
    }

    function push(value: string, type: TokenType, startLine = line, startColumn = column) {
        tokens.push(token(value, type, startLine, startColumn));
    }

    while (cursor < sourceCode.length) {
        if (isskippable(peek())) {
            take();
        }
        else if (peek() == "/" && peek(1) == "/") {
            readWhile(peek, take, (value) => value != "\n");
        }
        else if (peek() == "/" && peek(1) == "*") {
            take();
            take();
            while (cursor < sourceCode.length && `${peek()}${peek(1)}` != "*/") take();
            if (cursor < sourceCode.length) {
                take();
                take();
            }
        }
        else if (peek() == "#") {
            readWhile(peek, take, (value) => value != "\n");
        }
        else if (peek() == "(") push(take(), TokenType.OpenParen);
        else if (peek() == ")") push(take(), TokenType.CloseParen);
        else if (peek() == "{") push(take(), TokenType.OpenBrace);
        else if (peek() == "}") push(take(), TokenType.CloseBrace);
        else if (peek() == "[") push(take(), TokenType.OpenBracket);
        else if (peek() == "]") push(take(), TokenType.CloseBracket);
        else if (peek() == ";") push(take(), TokenType.Semicolon);
        else if (peek() == "?") push(take(), TokenType.Question);
        else if (peek() == ":") push(take(), TokenType.Colon);
        else if (peek() == ",") push(take(), TokenType.Comma);
        else if (peek() == ".") push(take(), TokenType.Dot);
        else if ((peek() == "+" || peek() == "-") && peek(1) == peek()) {
            const startLine = line, startColumn = column;
            push(`${take()}${take()}`, TokenType.UnaryOperator, startLine, startColumn);
        }
        else if ((peek() == ">" || peek() == "<") && peek(1) == "=") {
            const startLine = line, startColumn = column;
            push(`${take()}${take()}`, TokenType.RelationalOperator, startLine, startColumn);
        }
        else if ((peek() == "=" || peek() == "!") && peek(1) == "=") {
            const startLine = line, startColumn = column;
            push(`${take()}${take()}`, TokenType.EqualityOperator, startLine, startColumn);
        }
        else if ((peek() == "&" && peek(1) == "&") || (peek() == "|" && peek(1) == "|")) {
            const startLine = line, startColumn = column;
            push(`${take()}${take()}`, TokenType.LogicalOperator, startLine, startColumn);
        }
        else if ((peek() == "+" || peek() == "-" || peek() == "*" || peek() == "/" || peek() == "%") && peek(1) == "=") {
            const startLine = line, startColumn = column;
            push(`${take()}${take()}`, TokenType.AssignmentOperator, startLine, startColumn);
        }
        else if (peek() == "=") push(take(), TokenType.Equals);
        else if (peek() == ">" || peek() == "<") push(take(), TokenType.RelationalOperator);
        else if (peek() == "+" || peek() == "-" || peek() == "*" || peek() == "/" || peek() == "%") push(take(), TokenType.BinaryOperator);
        else if (peek() == "!") push(take(), TokenType.UnaryOperator);
        else if (isint(peek()) || (peek() == "." && peek(1) && isint(peek(1)))) {
            const startLine = line, startColumn = column;
            let value = readWhile(peek, take, (char) => isint(char) || char == ".");
            if (peek() == "u" || peek() == "U") value += take();
            push(value, TokenType.Number, startLine, startColumn);
        }
        else if (isword(peek())) {
            const startLine = line, startColumn = column;
            const ident = readWhile(peek, take, isword);
            if (TYPES.has(ident)) push(ident, TokenType.Type, startLine, startColumn);
            else if (QUALIFIERS.has(ident)) push(ident, TokenType.Qualifier, startLine, startColumn);
            else if (PRECISION.has(ident)) push(ident, TokenType.Precision, startLine, startColumn);
            else if (ident == "return") push(ident, TokenType.Return, startLine, startColumn);
            else if (ident == "if") push(ident, TokenType.If, startLine, startColumn);
            else if (ident == "else") push(ident, TokenType.Else, startLine, startColumn);
            else if (ident == "for") push(ident, TokenType.For, startLine, startColumn);
            else if (ident == "true" || ident == "false") push(ident, TokenType.Bool, startLine, startColumn);
            else push(ident, TokenType.Identifier, startLine, startColumn);
        }
        else {
            throw Error(`Unrecognized character found in source at ${line}:${column}: ${peek()}`);
        }
    }

    tokens.push(token("EndOfFile", TokenType.EOF, line, column));
    return tokens;
}
