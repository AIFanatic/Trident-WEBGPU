import { codeGenerator } from './CodeGenerator.js';
import { Formatter } from './Formatter.js';
import { Parser } from './Parser.js';
import { transformer } from './Transformer.js';

function GLSL2WGSL(source, options = {}) {
  const parser = new Parser();
  const ast = parser.produceAST(source);
  const transformed = transformer(ast);
  const wgsl = codeGenerator(transformed, options);
  return options.format == false ? wgsl : Formatter(wgsl);
}

export { Formatter, GLSL2WGSL, Parser, codeGenerator, transformer };
