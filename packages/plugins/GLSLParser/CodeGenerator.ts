import {
    AssignmentExpr,
    BinaryExpr,
    BooleanLiteral,
    CallExpr,
    ConditionalExpr,
    ConditionalDeclaration,
    ExpressionStatement,
    ForLoopDeclaration,
    FunctionDeclaration,
    Identifier,
    IndexExpr,
    MemberExpr,
    NumericLiteral,
    Program,
    ReturnDeclaration,
    Stmt,
    UnaryExpr,
    VarDeclaration,
    VarDeclarationList,
} from "./AST";
import { LocationDeclaration, NewStmt, UniformDeclaration } from "./ExtraAST";

export interface GLSLParserOptions {
    stage?: "vertex" | "fragment";
}

interface GeneratorContext {
    stage?: "vertex" | "fragment";
    inputs?: Record<string, string>;
    outputs?: Record<string, string>;
    parameter?: boolean;
    pointers?: Record<string, boolean>;
    module?: boolean;
    functions?: Record<string, VarDeclaration[]>;
}

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
    samplerCube: "texture_cube<f32>",
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
    mod: "mod",
};

function wgslType(type: string) {
    return GlslTypeToWGSL[type] || type;
}

function getPrecedence(operator: string): number {
    const precedence = {
        "||": 1,
        "&&": 2,
        "==": 3, "!=": 3,
        "<": 4, "<=": 4, ">": 4, ">=": 4,
        "+": 5, "-": 5,
        "*": 6, "/": 6, "%": 6,
    };
    return precedence[operator] || -1;
}

function needsParentheses(parentOp: string, childOp: string, isRight: boolean): boolean {
    const parentPrec = getPrecedence(parentOp);
    const childPrec = getPrecedence(childOp);
    if (childPrec < parentPrec) return true;
    if (childPrec == parentPrec && isRight) return true;
    return false;
}

function statementList(body: Stmt[], context?: GeneratorContext) {
    return body.map((node) => codeGenerator(node, context)).filter(Boolean).join("\n");
}

function varKeyword(declaration: VarDeclaration) {
    return declaration.qualifier == "const" ? "const" : "var";
}

function locationType(declaration: LocationDeclaration) {
    return wgslType(declaration.value.type);
}

function fieldName(identifier: string) {
    if (identifier == "gl_Position") return "position";
    if (identifier == "gl_FragColor") return "color";
    if (identifier == "gl_FragCoord") return "fragCoord";
    return identifier;
}

function locationStruct(name: string, declarations: LocationDeclaration[]) {
    if (declarations.length == 0) return "";
    const fields = declarations.map((declaration, index) => {
        return `@location(${index}) ${fieldName(declaration.value.identifier)}: ${locationType(declaration)},`;
    }).join("\n");
    return `struct ${name} {\n${fields}\n}`;
}

function vertexOutputStruct(declarations: LocationDeclaration[]) {
    const fields = [
        "@builtin(position) position: vec4<f32>,",
        ...declarations.map((declaration, index) => {
            return `@location(${index}) ${fieldName(declaration.value.identifier)}: ${locationType(declaration)},`;
        }),
    ].join("\n");
    return `struct VertexOutput {\n${fields}\n}`;
}

function fragmentOutputStruct() {
    return "struct FragmentOutput {\n@location(0) color: vec4<f32>,\n}";
}

function makeMap(declarations: LocationDeclaration[], prefix: string) {
    const map: Record<string, string> = {};
    for (const declaration of declarations) {
        map[declaration.value.identifier] = `${prefix}.${fieldName(declaration.value.identifier)}`;
    }
    return map;
}

function makeFunctionMap(body: Stmt[]) {
    const functions: Record<string, VarDeclaration[]> = {};
    for (const node of body) {
        if (node.kind == "FunctionDeclaration") {
            const declaration = node as FunctionDeclaration;
            functions[declaration.name] = declaration.parameters;
        }
    }
    return functions;
}

function isPointerIdentifier(node: Stmt, context?: GeneratorContext | GLSLParserOptions) {
    return node.kind == "Identifier" && !!(context as GeneratorContext)?.pointers?.[(node as Identifier).symbol];
}

function stageProgram(program: Program & { globals?: Stmt[] }, options: GLSLParserOptions) {
    const globals = (program.globals || []) as unknown as NewStmt[];
    const uniforms = globals.filter((node) => node.kind == "UniformDeclaration");
    const moduleBody = program.body.filter((node) => node.kind != "FunctionDeclaration");
    const locations = globals.filter((node) => node.kind == "LocationDeclaration") as unknown as LocationDeclaration[];
    const functions = program.body.filter((node) => node.kind == "FunctionDeclaration") as FunctionDeclaration[];
    const functionMap = makeFunctionMap(program.body);
    const main = functions.find((node) => node.name == "main");
    const helpers = functions.filter((node) => node.name != "main");

    const uniformCode = uniforms.map((node) => codeGenerator(node, { stage: options.stage })).join("\n");
    const moduleCode = moduleBody.map((node) => codeGenerator(node, { stage: options.stage, module: true, functions: functionMap })).join("\n");

    if (!main) return [
        uniformCode,
        moduleCode,
        functions.map((node) => codeGenerator(node, { stage: options.stage, functions: functionMap })).join("\n"),
    ].filter(Boolean).join("\n");

    const helperCode = helpers.map((node) => codeGenerator(node, { stage: options.stage, functions: functionMap })).join("\n");

    if (options.stage == "vertex") {
        const inputs = locations.filter((node) => node.qualifier == "attribute" || node.qualifier == "in");
        const outputs = locations.filter((node) => node.qualifier == "varying" || node.qualifier == "out");
        const context: GeneratorContext = {
            stage: "vertex",
            inputs: makeMap(inputs, "input"),
            outputs: { ...makeMap(outputs, "output"), gl_Position: "output.position" },
            functions: functionMap,
        };
        const inputStruct = locationStruct("VertexInput", inputs);
        const outputStruct = vertexOutputStruct(outputs);
        const body = statementList(main.body, context);
        const entry = `@vertex fn main(input: VertexInput) -> VertexOutput {\nvar output: VertexOutput;\n${body}\nreturn output;\n}`;
        return [uniformCode, moduleCode, inputStruct, outputStruct, helperCode, entry].filter(Boolean).join("\n");
    }

    const inputs = locations.filter((node) => node.qualifier == "varying" || node.qualifier == "in");
    const context: GeneratorContext = {
        stage: "fragment",
        inputs: makeMap(inputs, "input"),
        outputs: { gl_FragColor: "output.color" },
        functions: functionMap,
    };
    const inputStruct = locationStruct("FragmentInput", inputs);
    const outputStruct = fragmentOutputStruct();
    const body = statementList(main.body, context);
    const entry = `@fragment fn main(input: FragmentInput) -> FragmentOutput {\nvar output: FragmentOutput;\n${body}\nreturn output;\n}`;
    return [uniformCode, moduleCode, inputStruct, outputStruct, helperCode, entry].filter(Boolean).join("\n");
}

export function codeGenerator(node: NewStmt | Stmt, context?: GeneratorContext | GLSLParserOptions): string {
    switch (node.kind) {
        case "Program": {
            const program = node as Program & { globals?: Stmt[] };
            if ((context as GLSLParserOptions)?.stage) return stageProgram(program, context as GLSLParserOptions);
            const functions = makeFunctionMap(program.body);
            const moduleContext = { ...(context as GeneratorContext), module: true, functions };
            const globals = (program.globals || []).map((node) => codeGenerator(node, moduleContext)).filter(Boolean).join("\n");
            const body = statementList(program.body, moduleContext);
            return [globals, body].filter(Boolean).join("\n");
        }

        case "PrecisionDeclaration":
            return "";

        case "Identifier":
            if ((context as GeneratorContext)?.pointers?.[(node as Identifier).symbol]) return `*${(node as Identifier).symbol}`;
            return (context as GeneratorContext)?.inputs?.[(node as Identifier).symbol]
                || (context as GeneratorContext)?.outputs?.[(node as Identifier).symbol]
                || (node as Identifier).symbol;

        case "NumericLiteral":
            return (node as NumericLiteral).value;

        case "BooleanLiteral":
            return (node as BooleanLiteral).value ? "true" : "false";

        case "BinaryExpr": {
            const expr = node as BinaryExpr;
            let left = codeGenerator(expr.left, context);
            let right = codeGenerator(expr.right, context);

            if (expr.left.kind == "BinaryExpr" && needsParentheses(expr.operator, (expr.left as BinaryExpr).operator, false)) left = `(${left})`;
            if (expr.right.kind == "BinaryExpr" && needsParentheses(expr.operator, (expr.right as BinaryExpr).operator, true)) right = `(${right})`;

            return `${left} ${expr.operator} ${right}`;
        }

        case "ConditionalExpr": {
            const expr = node as ConditionalExpr;
            return `select(${codeGenerator(expr.alternate, context)}, ${codeGenerator(expr.consequent, context)}, ${codeGenerator(expr.test, context)})`;
        }

        case "UnaryExpr": {
            const expr = node as UnaryExpr;
            const operand = codeGenerator(expr.operand, context);
            return expr.prefix ? `${expr.operator}${operand}` : `${operand}${expr.operator}`;
        }

        case "AssignmentExpr": {
            const expr = node as AssignmentExpr;
            return `${codeGenerator(expr.assigne, context)} ${expr.operator} ${codeGenerator(expr.value, context)}`;
        }

        case "ExpressionStatement": {
            const expr = node as ExpressionStatement;
            return `${codeGenerator(expr.expression, context).replace(/;$/, "")};`;
        }

        case "VarDeclaration": {
            const declaration = node as VarDeclaration;
            const arraySize = declaration.arraySize ? `, ${codeGenerator(declaration.arraySize, context)}` : "";
            const type = declaration.arraySize ? `array<${wgslType(declaration.type)}${arraySize}>` : wgslType(declaration.type);
            const value = declaration.value ? ` = ${codeGenerator(declaration.value, context)}` : "";

            if ((context as GeneratorContext)?.parameter) {
                if (declaration.qualifier == "out" || declaration.qualifier == "inout") return `${declaration.identifier}: ptr<function, ${type}>`;
                return `${declaration.identifier}: ${type}`;
            }
            if ((context as GeneratorContext)?.module && varKeyword(declaration) == "var") {
                return `var<private> ${declaration.identifier}: ${type}${value};`;
            }
            return `${varKeyword(declaration)} ${declaration.identifier}: ${type}${value};`;
        }

        case "VarDeclarationList":
            return (node as VarDeclarationList).declarations.map((declaration) => codeGenerator(declaration, context)).join("\n");

        case "ReturnDeclaration": {
            const declaration = node as ReturnDeclaration;
            return declaration.value ? `return ${codeGenerator(declaration.value, context)};` : "return;";
        }

        case "ConditionalDeclaration": {
            const declaration = node as ConditionalDeclaration;
            const body = statementList(declaration.body, context as GeneratorContext);
            const alternate = declaration.alternate ? ` else {\n${statementList(declaration.alternate, context as GeneratorContext)}\n}` : "";
            return `if (${codeGenerator(declaration.test, context)}) {\n${body}\n}${alternate}`;
        }

        case "ForLoopDeclaration": {
            const declaration = node as ForLoopDeclaration;
            const init = declaration.init ? codeGenerator(declaration.init, context).replace(/;$/, "") : "";
            const condition = declaration.condition ? codeGenerator(declaration.condition, context).replace(/;$/, "") : "";
            const increment = declaration.increment ? codeGenerator(declaration.increment, context).replace(/;$/, "") : "";
            return `for (${init}; ${condition}; ${increment}) {\n${statementList(declaration.body, context as GeneratorContext)}\n}`;
        }

        case "MemberExpr": {
            const expr = node as MemberExpr;
            if (isPointerIdentifier(expr.object, context)) return `(*${(expr.object as Identifier).symbol}).${codeGenerator(expr.property)}`;
            return `${codeGenerator(expr.object, context)}.${codeGenerator(expr.property)}`;
        }

        case "IndexExpr": {
            const expr = node as IndexExpr;
            if (isPointerIdentifier(expr.object, context)) return `(*${(expr.object as Identifier).symbol})[${codeGenerator(expr.index, context)}]`;
            return `${codeGenerator(expr.object, context)}[${codeGenerator(expr.index, context)}]`;
        }

        case "CallExpr": {
            const expr = node as CallExpr;
            const caller = codeGenerator(expr.caller);
            const name = GlslCallToWGSL[caller] || caller;
            const signature = (context as GeneratorContext)?.functions?.[caller];
            const args = expr.args.map((node, index) => {
                const parameter = signature?.[index];
                if (parameter?.qualifier == "out" || parameter?.qualifier == "inout") {
                    if (isPointerIdentifier(node, context)) return (node as Identifier).symbol;
                    return `&${codeGenerator(node, context)}`;
                }
                return codeGenerator(node, context);
            });

            if ((caller == "texture2D" || caller == "textureCube") && args.length >= 2) {
                args.splice(1, 0, `${args[0]}Sampler`);
            }

            return `${name}(${args.join(", ")})`;
        }

        case "FunctionDeclaration": {
            const declaration = node as FunctionDeclaration;
            const pointers: Record<string, boolean> = {};
            for (const param of declaration.parameters) {
                if (param.qualifier == "out" || param.qualifier == "inout") pointers[param.identifier] = true;
            }
            const functionContext = { ...(context as GeneratorContext), module: false };
            const args = declaration.parameters.map((node) => codeGenerator(node, { ...functionContext, parameter: true })).join(", ");
            const body = statementList(declaration.body, { ...functionContext, pointers });
            const returnType = declaration.type == "void" ? "" : ` -> ${wgslType(declaration.type)}`;
            return `fn ${declaration.name}(${args})${returnType} {\n${body}\n}`;
        }

        case "UniformDeclaration": {
            const declaration = node as UniformDeclaration;
            const group = "@group(0)";
            const binding = `@binding(${declaration.binding})`;

            if (declaration.type == "sampler2D" || declaration.type == "samplerCube") {
                const samplerBinding = `@binding(${declaration.binding + 1})`;
                return `${group} ${binding} var ${declaration.identifier}: ${wgslType(declaration.type)};\n${group} ${samplerBinding} var ${declaration.identifier}Sampler: sampler;`;
            }

            const type = declaration.arraySize ? `array<${wgslType(declaration.type)}, ${codeGenerator(declaration.arraySize, context)}>` : wgslType(declaration.type);
            return `${group} ${binding} var<uniform> ${declaration.identifier}: ${type};`;
        }

        case "LocationDeclaration":
            return "";

        default:
            throw new Error(`Cannot handle ${(node as NewStmt).kind}`);
    }
}
