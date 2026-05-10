function traverser(ast, visitor) {
  function traverseArray(array, parent) {
    array.forEach((child) => traverseNode(child, parent));
  }
  function traverseNode(node, parent) {
    const methods = visitor[node.kind];
    if (methods && methods.enter) methods.enter(node, parent);
    switch (node.kind) {
      case "Program":
        traverseArray(node.body, node);
        break;
      case "FunctionDeclaration":
        traverseArray(node.parameters, node);
        traverseArray(node.body, node);
        break;
      case "ExpressionStatement":
        traverseNode(node.expression, node);
        break;
      case "VarDeclaration":
        if (node.arraySize) traverseNode(node.arraySize, node);
        if (node.value) traverseNode(node.value, node);
        break;
      case "VarDeclarationList":
        traverseArray(node.declarations, node);
        break;
      case "ReturnDeclaration":
        if (node.value) traverseNode(node.value, node);
        break;
      case "ConditionalDeclaration":
        traverseNode(node.test, node);
        traverseArray(node.body, node);
        if (node.alternate) traverseArray(node.alternate, node);
        break;
      case "ForLoopDeclaration":
        if (node.init) traverseNode(node.init, node);
        if (node.condition) traverseNode(node.condition, node);
        if (node.increment) traverseNode(node.increment, node);
        traverseArray(node.body, node);
        break;
      case "AssignmentExpr":
        traverseNode(node.assigne, node);
        traverseNode(node.value, node);
        break;
      case "BinaryExpr":
        traverseNode(node.left, node);
        traverseNode(node.right, node);
        break;
      case "ConditionalExpr":
        traverseNode(node.test, node);
        traverseNode(node.consequent, node);
        traverseNode(node.alternate, node);
        break;
      case "UnaryExpr":
        traverseNode(node.operand, node);
        break;
      case "CallExpr":
        traverseNode(node.caller, node);
        traverseArray(node.args, node);
        break;
      case "MemberExpr":
        traverseNode(node.object, node);
        traverseNode(node.property, node);
        break;
      case "IndexExpr":
        traverseNode(node.object, node);
        traverseNode(node.index, node);
        break;
      case "PrecisionDeclaration":
      case "NumericLiteral":
      case "BooleanLiteral":
      case "Identifier":
        break;
      default:
        throw new Error(`Cannot handle ${node.kind}`);
    }
    if (methods && methods.exit) methods.exit(node, parent);
  }
  traverseNode(ast, null);
}

export { traverser };
