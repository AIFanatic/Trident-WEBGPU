import { codeGenerator, GLSLParserOptions } from "./CodeGenerator";
import { Formatter } from "./Formatter";
import { Parser } from "./Parser";
import { transformer } from "./Transformer";

export { Parser } from "./Parser";
export { codeGenerator } from "./CodeGenerator";
export type { GLSLParserOptions } from "./CodeGenerator";
export { transformer } from "./Transformer";
export { Formatter } from "./Formatter";

export function GLSL2WGSL(source: string, options: GLSLParserOptions & { format?: boolean } = {}) {
    const parser = new Parser();
    const ast = parser.produceAST(source);
    const transformed = transformer(ast);
    const wgsl = codeGenerator(transformed, options);
    return options.format == false ? wgsl : Formatter(wgsl);
}
