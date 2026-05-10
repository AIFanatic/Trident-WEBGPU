var TokenType = /* @__PURE__ */ ((TokenType2) => {
  TokenType2[TokenType2["Number"] = 0] = "Number";
  TokenType2[TokenType2["Identifier"] = 1] = "Identifier";
  TokenType2[TokenType2["Type"] = 2] = "Type";
  TokenType2[TokenType2["Precision"] = 3] = "Precision";
  TokenType2[TokenType2["Qualifier"] = 4] = "Qualifier";
  TokenType2[TokenType2["Return"] = 5] = "Return";
  TokenType2[TokenType2["If"] = 6] = "If";
  TokenType2[TokenType2["Else"] = 7] = "Else";
  TokenType2[TokenType2["For"] = 8] = "For";
  TokenType2[TokenType2["Bool"] = 9] = "Bool";
  TokenType2[TokenType2["UnaryOperator"] = 10] = "UnaryOperator";
  TokenType2[TokenType2["BinaryOperator"] = 11] = "BinaryOperator";
  TokenType2[TokenType2["RelationalOperator"] = 12] = "RelationalOperator";
  TokenType2[TokenType2["EqualityOperator"] = 13] = "EqualityOperator";
  TokenType2[TokenType2["LogicalOperator"] = 14] = "LogicalOperator";
  TokenType2[TokenType2["AssignmentOperator"] = 15] = "AssignmentOperator";
  TokenType2[TokenType2["Equals"] = 16] = "Equals";
  TokenType2[TokenType2["Question"] = 17] = "Question";
  TokenType2[TokenType2["Colon"] = 18] = "Colon";
  TokenType2[TokenType2["Comma"] = 19] = "Comma";
  TokenType2[TokenType2["Dot"] = 20] = "Dot";
  TokenType2[TokenType2["Semicolon"] = 21] = "Semicolon";
  TokenType2[TokenType2["OpenParen"] = 22] = "OpenParen";
  TokenType2[TokenType2["CloseParen"] = 23] = "CloseParen";
  TokenType2[TokenType2["OpenBrace"] = 24] = "OpenBrace";
  TokenType2[TokenType2["CloseBrace"] = 25] = "CloseBrace";
  TokenType2[TokenType2["OpenBracket"] = 26] = "OpenBracket";
  TokenType2[TokenType2["CloseBracket"] = 27] = "CloseBracket";
  TokenType2[TokenType2["EOF"] = 28] = "EOF";
  return TokenType2;
})(TokenType || {});
const TYPES = /* @__PURE__ */ new Set([
  "void",
  "bool",
  "int",
  "uint",
  "float",
  "vec2",
  "vec3",
  "vec4",
  "ivec2",
  "ivec3",
  "ivec4",
  "uvec2",
  "uvec3",
  "uvec4",
  "bvec2",
  "bvec3",
  "bvec4",
  "mat2",
  "mat3",
  "mat4",
  "sampler2D",
  "samplerCube"
]);
const QUALIFIERS = /* @__PURE__ */ new Set([
  "uniform",
  "attribute",
  "varying",
  "in",
  "out",
  "inout",
  "const"
]);
const PRECISION = /* @__PURE__ */ new Set(["precision", "lowp", "mediump", "highp"]);
function token(value, type, line, column) {
  return { value, type, line, column };
}
function isword(str) {
  return /^[a-zA-Z0-9_]+$/.test(str);
}
function isint(str) {
  const c = str.charCodeAt(0);
  return c >= 48 && c <= 57;
}
function isskippable(str) {
  return str == " " || str == "\n" || str == "	" || str == "\r";
}
function readWhile(peek, take, test) {
  let value = "";
  while (peek() && test(peek())) value += take();
  return value;
}
function tokenize(sourceCode) {
  const tokens = new Array();
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
    } else {
      column++;
    }
    return value;
  }
  function push(value, type, startLine = line, startColumn = column) {
    tokens.push(token(value, type, startLine, startColumn));
  }
  while (cursor < sourceCode.length) {
    if (isskippable(peek())) {
      take();
    } else if (peek() == "/" && peek(1) == "/") {
      readWhile(peek, take, (value) => value != "\n");
    } else if (peek() == "/" && peek(1) == "*") {
      take();
      take();
      while (cursor < sourceCode.length && `${peek()}${peek(1)}` != "*/") take();
      if (cursor < sourceCode.length) {
        take();
        take();
      }
    } else if (peek() == "#") {
      readWhile(peek, take, (value) => value != "\n");
    } else if (peek() == "(") push(take(), 22 /* OpenParen */);
    else if (peek() == ")") push(take(), 23 /* CloseParen */);
    else if (peek() == "{") push(take(), 24 /* OpenBrace */);
    else if (peek() == "}") push(take(), 25 /* CloseBrace */);
    else if (peek() == "[") push(take(), 26 /* OpenBracket */);
    else if (peek() == "]") push(take(), 27 /* CloseBracket */);
    else if (peek() == ";") push(take(), 21 /* Semicolon */);
    else if (peek() == "?") push(take(), 17 /* Question */);
    else if (peek() == ":") push(take(), 18 /* Colon */);
    else if (peek() == ",") push(take(), 19 /* Comma */);
    else if (peek() == ".") push(take(), 20 /* Dot */);
    else if ((peek() == "+" || peek() == "-") && peek(1) == peek()) {
      const startLine = line, startColumn = column;
      push(`${take()}${take()}`, 10 /* UnaryOperator */, startLine, startColumn);
    } else if ((peek() == ">" || peek() == "<") && peek(1) == "=") {
      const startLine = line, startColumn = column;
      push(`${take()}${take()}`, 12 /* RelationalOperator */, startLine, startColumn);
    } else if ((peek() == "=" || peek() == "!") && peek(1) == "=") {
      const startLine = line, startColumn = column;
      push(`${take()}${take()}`, 13 /* EqualityOperator */, startLine, startColumn);
    } else if (peek() == "&" && peek(1) == "&" || peek() == "|" && peek(1) == "|") {
      const startLine = line, startColumn = column;
      push(`${take()}${take()}`, 14 /* LogicalOperator */, startLine, startColumn);
    } else if ((peek() == "+" || peek() == "-" || peek() == "*" || peek() == "/" || peek() == "%") && peek(1) == "=") {
      const startLine = line, startColumn = column;
      push(`${take()}${take()}`, 15 /* AssignmentOperator */, startLine, startColumn);
    } else if (peek() == "=") push(take(), 16 /* Equals */);
    else if (peek() == ">" || peek() == "<") push(take(), 12 /* RelationalOperator */);
    else if (peek() == "+" || peek() == "-" || peek() == "*" || peek() == "/" || peek() == "%") push(take(), 11 /* BinaryOperator */);
    else if (peek() == "!") push(take(), 10 /* UnaryOperator */);
    else if (isint(peek()) || peek() == "." && peek(1) && isint(peek(1))) {
      const startLine = line, startColumn = column;
      let value = readWhile(peek, take, (char) => isint(char) || char == ".");
      if (peek() == "u" || peek() == "U") value += take();
      push(value, 0 /* Number */, startLine, startColumn);
    } else if (isword(peek())) {
      const startLine = line, startColumn = column;
      const ident = readWhile(peek, take, isword);
      if (TYPES.has(ident)) push(ident, 2 /* Type */, startLine, startColumn);
      else if (QUALIFIERS.has(ident)) push(ident, 4 /* Qualifier */, startLine, startColumn);
      else if (PRECISION.has(ident)) push(ident, 3 /* Precision */, startLine, startColumn);
      else if (ident == "return") push(ident, 5 /* Return */, startLine, startColumn);
      else if (ident == "if") push(ident, 6 /* If */, startLine, startColumn);
      else if (ident == "else") push(ident, 7 /* Else */, startLine, startColumn);
      else if (ident == "for") push(ident, 8 /* For */, startLine, startColumn);
      else if (ident == "true" || ident == "false") push(ident, 9 /* Bool */, startLine, startColumn);
      else push(ident, 1 /* Identifier */, startLine, startColumn);
    } else {
      throw Error(`Unrecognized character found in source at ${line}:${column}: ${peek()}`);
    }
  }
  tokens.push(token("EndOfFile", 28 /* EOF */, line, column));
  return tokens;
}

export { TokenType, tokenize };
