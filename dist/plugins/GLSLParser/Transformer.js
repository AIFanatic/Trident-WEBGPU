import { traverser } from './Traverser.js';

function transformer(ast) {
  const newAst = {
    kind: "Program",
    body: [],
    globals: [],
    counters: {
      binding: 0,
      location: 0
    }
  };
  ast._context = {
    body: newAst.body,
    globals: newAst.globals,
    counters: newAst.counters
  };
  traverser(ast, {
    Program: { enter() {
    } },
    PrecisionDeclaration: { enter() {
    } },
    NumericLiteral: { enter(node, parent) {
      parent._context?.body.push(node);
    } },
    BooleanLiteral: { enter(node, parent) {
      parent._context?.body.push(node);
    } },
    Identifier: { enter(node, parent) {
      parent._context?.body.push(node);
    } },
    ExpressionStatement: {
      enter(node, parent) {
        node._context = { body: [node.expression], globals: [] };
        parent._context?.body.push(node);
      }
    },
    BinaryExpr: {
      enter(node, parent) {
        node._context = { body: [node.left, node.right], globals: [] };
        parent._context?.body.push(node);
      }
    },
    ConditionalExpr: {
      enter(node, parent) {
        node._context = { body: [node.test, node.consequent, node.alternate], globals: [] };
        parent._context?.body.push(node);
      }
    },
    UnaryExpr: {
      enter(node, parent) {
        node._context = { body: [node.operand], globals: [] };
        parent._context?.body.push(node);
      }
    },
    AssignmentExpr: {
      enter(node, parent) {
        node._context = { body: [node.assigne, node.value], globals: [] };
        parent._context?.body.push(node);
      }
    },
    CallExpr: {
      enter(node, parent) {
        node._context = { body: [node.caller, ...node.args], globals: [] };
        parent._context?.body.push(node);
      }
    },
    MemberExpr: {
      enter(node, parent) {
        node._context = { body: [node.object, node.property], globals: [] };
        parent._context?.body.push(node);
      }
    },
    IndexExpr: {
      enter(node, parent) {
        node._context = { body: [node.object, node.index], globals: [] };
        parent._context?.body.push(node);
      }
    },
    ReturnDeclaration: {
      enter(node, parent) {
        node._context = { body: node.value ? [node.value] : [], globals: [] };
        parent._context?.body.push(node);
      }
    },
    ConditionalDeclaration: {
      enter(node, parent) {
        node._context = {
          body: [node.test, ...node.body, ...node.alternate || []],
          globals: []
        };
        parent._context?.body.push(node);
      }
    },
    ForLoopDeclaration: {
      enter(node, parent) {
        node._context = {
          body: [node.init, node.condition, node.increment, ...node.body].filter(Boolean),
          globals: []
        };
        parent._context?.body.push(node);
      }
    },
    VarDeclaration: {
      enter(node, parent) {
        node._context = { body: [node.arraySize, node.value].filter(Boolean), globals: [] };
        if (parent.kind == "FunctionDeclaration") return;
        if (node.qualifier == "uniform") {
          const binding = parent._context.counters.binding;
          parent._context.counters.binding += node.type == "sampler2D" || node.type == "samplerCube" ? 2 : 1;
          const uniform = {
            kind: "UniformDeclaration",
            binding,
            identifier: node.identifier,
            type: node.type,
            arraySize: node.arraySize
          };
          parent._context?.globals.push(uniform);
          return;
        }
        if (node.qualifier == "attribute" || node.qualifier == "varying" || node.qualifier == "in" || node.qualifier == "out") {
          const location = {
            kind: "LocationDeclaration",
            location: parent._context.counters.location++,
            qualifier: node.qualifier,
            value: node
          };
          parent._context?.globals.push(location);
          return;
        }
        parent._context?.body.push(node);
      }
    },
    VarDeclarationList: {
      enter(node, parent) {
        node._context = parent._context;
      }
    },
    FunctionDeclaration: {
      enter(node, parent) {
        const func = {
          kind: "FunctionDeclaration",
          type: node.type,
          name: node.name,
          parameters: node.parameters,
          body: node.body
        };
        node._context = { body: [...node.parameters, ...node.body], globals: [] };
        parent._context?.body.push(func);
      }
    }
  });
  return newAst;
}

export { transformer };
