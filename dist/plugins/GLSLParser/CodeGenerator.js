const GlslTypeToWGSL = {
  void: "",
  bool: "bool",
  int: "i32",
  uint: "u32",
  float: "f32",
  vec2: "vec2<f32>",
  vec3: "vec3<f32>",
  vec4: "vec4<f32>",
  ivec2: "vec2<i32>",
  ivec3: "vec3<i32>",
  ivec4: "vec4<i32>",
  uvec2: "vec2<u32>",
  uvec3: "vec3<u32>",
  uvec4: "vec4<u32>",
  bvec2: "vec2<bool>",
  bvec3: "vec3<bool>",
  bvec4: "vec4<bool>",
  mat2: "mat2x2<f32>",
  mat3: "mat3x3<f32>",
  mat4: "mat4x4<f32>",
  sampler2D: "texture_2d<f32>",
  samplerCube: "texture_cube<f32>"
};
const GlslCallToWGSL = {
  bool: "bool",
  int: "i32",
  uint: "u32",
  float: "f32",
  vec2: "vec2<f32>",
  vec3: "vec3<f32>",
  vec4: "vec4<f32>",
  ivec2: "vec2<i32>",
  ivec3: "vec3<i32>",
  ivec4: "vec4<i32>",
  uvec2: "vec2<u32>",
  uvec3: "vec3<u32>",
  uvec4: "vec4<u32>",
  bvec2: "vec2<bool>",
  bvec3: "vec3<bool>",
  bvec4: "vec4<bool>",
  mat2: "mat2x2<f32>",
  mat3: "mat3x3<f32>",
  mat4: "mat4x4<f32>",
  texture2D: "textureSample",
  textureCube: "textureSample",
  mix: "mix",
  fract: "fract",
  mod: "mod"
};
function wgslType(type) {
  return GlslTypeToWGSL[type] || type;
}
function getPrecedence(operator) {
  const precedence = {
    "||": 1,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "<": 4,
    "<=": 4,
    ">": 4,
    ">=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6
  };
  return precedence[operator] || -1;
}
function needsParentheses(parentOp, childOp, isRight) {
  const parentPrec = getPrecedence(parentOp);
  const childPrec = getPrecedence(childOp);
  if (childPrec < parentPrec) return true;
  if (childPrec == parentPrec && isRight) return true;
  return false;
}
function statementList(body, context) {
  return body.map((node) => codeGenerator(node, context)).filter(Boolean).join("\n");
}
function varKeyword(declaration) {
  return declaration.qualifier == "const" ? "const" : "var";
}
function locationType(declaration) {
  return wgslType(declaration.value.type);
}
function fieldName(identifier) {
  if (identifier == "gl_Position") return "position";
  if (identifier == "gl_FragColor") return "color";
  if (identifier == "gl_FragCoord") return "fragCoord";
  return identifier;
}
function locationStruct(name, declarations) {
  if (declarations.length == 0) return "";
  const fields = declarations.map((declaration, index) => {
    return `@location(${index}) ${fieldName(declaration.value.identifier)}: ${locationType(declaration)},`;
  }).join("\n");
  return `struct ${name} {
${fields}
}`;
}
function vertexOutputStruct(declarations) {
  const fields = [
    "@builtin(position) position: vec4<f32>,",
    ...declarations.map((declaration, index) => {
      return `@location(${index}) ${fieldName(declaration.value.identifier)}: ${locationType(declaration)},`;
    })
  ].join("\n");
  return `struct VertexOutput {
${fields}
}`;
}
function fragmentOutputStruct() {
  return "struct FragmentOutput {\n@location(0) color: vec4<f32>,\n}";
}
function makeMap(declarations, prefix) {
  const map = {};
  for (const declaration of declarations) {
    map[declaration.value.identifier] = `${prefix}.${fieldName(declaration.value.identifier)}`;
  }
  return map;
}
function makeFunctionMap(body) {
  const functions = {};
  for (const node of body) {
    if (node.kind == "FunctionDeclaration") {
      const declaration = node;
      functions[declaration.name] = declaration.parameters;
    }
  }
  return functions;
}
function isPointerIdentifier(node, context) {
  return node.kind == "Identifier" && !!context?.pointers?.[node.symbol];
}
function stageProgram(program, options) {
  const globals = program.globals || [];
  const uniforms = globals.filter((node) => node.kind == "UniformDeclaration");
  const moduleBody = program.body.filter((node) => node.kind != "FunctionDeclaration");
  const locations = globals.filter((node) => node.kind == "LocationDeclaration");
  const functions = program.body.filter((node) => node.kind == "FunctionDeclaration");
  const functionMap = makeFunctionMap(program.body);
  const main = functions.find((node) => node.name == "main");
  const helpers = functions.filter((node) => node.name != "main");
  const uniformCode = uniforms.map((node) => codeGenerator(node, { stage: options.stage })).join("\n");
  const moduleCode = moduleBody.map((node) => codeGenerator(node, { stage: options.stage, module: true, functions: functionMap })).join("\n");
  if (!main) return [
    uniformCode,
    moduleCode,
    functions.map((node) => codeGenerator(node, { stage: options.stage, functions: functionMap })).join("\n")
  ].filter(Boolean).join("\n");
  const helperCode = helpers.map((node) => codeGenerator(node, { stage: options.stage, functions: functionMap })).join("\n");
  if (options.stage == "vertex") {
    const inputs2 = locations.filter((node) => node.qualifier == "attribute" || node.qualifier == "in");
    const outputs = locations.filter((node) => node.qualifier == "varying" || node.qualifier == "out");
    const context2 = {
      stage: "vertex",
      inputs: makeMap(inputs2, "input"),
      outputs: { ...makeMap(outputs, "output"), gl_Position: "output.position" },
      functions: functionMap
    };
    const inputStruct2 = locationStruct("VertexInput", inputs2);
    const outputStruct2 = vertexOutputStruct(outputs);
    const body2 = statementList(main.body, context2);
    const entry2 = `@vertex fn main(input: VertexInput) -> VertexOutput {
var output: VertexOutput;
${body2}
return output;
}`;
    return [uniformCode, moduleCode, inputStruct2, outputStruct2, helperCode, entry2].filter(Boolean).join("\n");
  }
  const inputs = locations.filter((node) => node.qualifier == "varying" || node.qualifier == "in");
  const context = {
    stage: "fragment",
    inputs: makeMap(inputs, "input"),
    outputs: { gl_FragColor: "output.color" },
    functions: functionMap
  };
  const inputStruct = locationStruct("FragmentInput", inputs);
  const outputStruct = fragmentOutputStruct();
  const body = statementList(main.body, context);
  const entry = `@fragment fn main(input: FragmentInput) -> FragmentOutput {
var output: FragmentOutput;
${body}
return output;
}`;
  return [uniformCode, moduleCode, inputStruct, outputStruct, helperCode, entry].filter(Boolean).join("\n");
}
function codeGenerator(node, context) {
  switch (node.kind) {
    case "Program": {
      const program = node;
      if (context?.stage) return stageProgram(program, context);
      const functions = makeFunctionMap(program.body);
      const moduleContext = { ...context, module: true, functions };
      const globals = (program.globals || []).map((node2) => codeGenerator(node2, moduleContext)).filter(Boolean).join("\n");
      const body = statementList(program.body, moduleContext);
      return [globals, body].filter(Boolean).join("\n");
    }
    case "PrecisionDeclaration":
      return "";
    case "Identifier":
      if (context?.pointers?.[node.symbol]) return `*${node.symbol}`;
      return context?.inputs?.[node.symbol] || context?.outputs?.[node.symbol] || node.symbol;
    case "NumericLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value ? "true" : "false";
    case "BinaryExpr": {
      const expr = node;
      let left = codeGenerator(expr.left, context);
      let right = codeGenerator(expr.right, context);
      if (expr.left.kind == "BinaryExpr" && needsParentheses(expr.operator, expr.left.operator, false)) left = `(${left})`;
      if (expr.right.kind == "BinaryExpr" && needsParentheses(expr.operator, expr.right.operator, true)) right = `(${right})`;
      return `${left} ${expr.operator} ${right}`;
    }
    case "ConditionalExpr": {
      const expr = node;
      return `select(${codeGenerator(expr.alternate, context)}, ${codeGenerator(expr.consequent, context)}, ${codeGenerator(expr.test, context)})`;
    }
    case "UnaryExpr": {
      const expr = node;
      const operand = codeGenerator(expr.operand, context);
      return expr.prefix ? `${expr.operator}${operand}` : `${operand}${expr.operator}`;
    }
    case "AssignmentExpr": {
      const expr = node;
      return `${codeGenerator(expr.assigne, context)} ${expr.operator} ${codeGenerator(expr.value, context)}`;
    }
    case "ExpressionStatement": {
      const expr = node;
      return `${codeGenerator(expr.expression, context).replace(/;$/, "")};`;
    }
    case "VarDeclaration": {
      const declaration = node;
      const arraySize = declaration.arraySize ? `, ${codeGenerator(declaration.arraySize, context)}` : "";
      const type = declaration.arraySize ? `array<${wgslType(declaration.type)}${arraySize}>` : wgslType(declaration.type);
      const value = declaration.value ? ` = ${codeGenerator(declaration.value, context)}` : "";
      if (context?.parameter) {
        if (declaration.qualifier == "out" || declaration.qualifier == "inout") return `${declaration.identifier}: ptr<function, ${type}>`;
        return `${declaration.identifier}: ${type}`;
      }
      if (context?.module && varKeyword(declaration) == "var") {
        return `var<private> ${declaration.identifier}: ${type}${value};`;
      }
      return `${varKeyword(declaration)} ${declaration.identifier}: ${type}${value};`;
    }
    case "VarDeclarationList":
      return node.declarations.map((declaration) => codeGenerator(declaration, context)).join("\n");
    case "ReturnDeclaration": {
      const declaration = node;
      return declaration.value ? `return ${codeGenerator(declaration.value, context)};` : "return;";
    }
    case "ConditionalDeclaration": {
      const declaration = node;
      const body = statementList(declaration.body, context);
      const alternate = declaration.alternate ? ` else {
${statementList(declaration.alternate, context)}
}` : "";
      return `if (${codeGenerator(declaration.test, context)}) {
${body}
}${alternate}`;
    }
    case "ForLoopDeclaration": {
      const declaration = node;
      const init = declaration.init ? codeGenerator(declaration.init, context).replace(/;$/, "") : "";
      const condition = declaration.condition ? codeGenerator(declaration.condition, context).replace(/;$/, "") : "";
      const increment = declaration.increment ? codeGenerator(declaration.increment, context).replace(/;$/, "") : "";
      return `for (${init}; ${condition}; ${increment}) {
${statementList(declaration.body, context)}
}`;
    }
    case "MemberExpr": {
      const expr = node;
      if (isPointerIdentifier(expr.object, context)) return `(*${expr.object.symbol}).${codeGenerator(expr.property)}`;
      return `${codeGenerator(expr.object, context)}.${codeGenerator(expr.property)}`;
    }
    case "IndexExpr": {
      const expr = node;
      if (isPointerIdentifier(expr.object, context)) return `(*${expr.object.symbol})[${codeGenerator(expr.index, context)}]`;
      return `${codeGenerator(expr.object, context)}[${codeGenerator(expr.index, context)}]`;
    }
    case "CallExpr": {
      const expr = node;
      const caller = codeGenerator(expr.caller);
      const name = GlslCallToWGSL[caller] || caller;
      const signature = context?.functions?.[caller];
      const args = expr.args.map((node2, index) => {
        const parameter = signature?.[index];
        if (parameter?.qualifier == "out" || parameter?.qualifier == "inout") {
          if (isPointerIdentifier(node2, context)) return node2.symbol;
          return `&${codeGenerator(node2, context)}`;
        }
        return codeGenerator(node2, context);
      });
      if ((caller == "texture2D" || caller == "textureCube") && args.length >= 2) {
        args.splice(1, 0, `${args[0]}Sampler`);
      }
      return `${name}(${args.join(", ")})`;
    }
    case "FunctionDeclaration": {
      const declaration = node;
      const pointers = {};
      for (const param of declaration.parameters) {
        if (param.qualifier == "out" || param.qualifier == "inout") pointers[param.identifier] = true;
      }
      const functionContext = { ...context, module: false };
      const args = declaration.parameters.map((node2) => codeGenerator(node2, { ...functionContext, parameter: true })).join(", ");
      const body = statementList(declaration.body, { ...functionContext, pointers });
      const returnType = declaration.type == "void" ? "" : ` -> ${wgslType(declaration.type)}`;
      return `fn ${declaration.name}(${args})${returnType} {
${body}
}`;
    }
    case "UniformDeclaration": {
      const declaration = node;
      const group = "@group(0)";
      const binding = `@binding(${declaration.binding})`;
      if (declaration.type == "sampler2D" || declaration.type == "samplerCube") {
        const samplerBinding = `@binding(${declaration.binding + 1})`;
        return `${group} ${binding} var ${declaration.identifier}: ${wgslType(declaration.type)};
${group} ${samplerBinding} var ${declaration.identifier}Sampler: sampler;`;
      }
      const type = declaration.arraySize ? `array<${wgslType(declaration.type)}, ${codeGenerator(declaration.arraySize, context)}>` : wgslType(declaration.type);
      return `${group} ${binding} var<uniform> ${declaration.identifier}: ${type};`;
    }
    case "LocationDeclaration":
      return "";
    default:
      throw new Error(`Cannot handle ${node.kind}`);
  }
}

export { codeGenerator };
