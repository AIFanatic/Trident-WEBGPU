import {
    AssignmentExpr,
    BinaryExpr,
    CallExpr,
    ConditionalExpr,
    ConditionalDeclaration,
    ExpressionStatement,
    ForLoopDeclaration,
    FunctionDeclaration,
    IndexExpr,
    MemberExpr,
    Program,
    ReturnDeclaration,
    Stmt,
    UnaryExpr,
    VarDeclaration,
    VarDeclarationList,
} from "./AST";

export function traverser(ast, visitor) {
    function traverseArray(array, parent) {
        array.forEach((child) => traverseNode(child, parent));
    }

    function traverseNode(node: Stmt, parent) {
        const methods = visitor[node.kind];
        if (methods && methods.enter) methods.enter(node, parent);

        switch (node.kind) {
            case "Program":
                traverseArray((node as Program).body, node);
                break;
            case "FunctionDeclaration":
                traverseArray((node as FunctionDeclaration).parameters, node);
                traverseArray((node as FunctionDeclaration).body, node);
                break;
            case "ExpressionStatement":
                traverseNode((node as ExpressionStatement).expression, node);
                break;
            case "VarDeclaration":
                if ((node as VarDeclaration).arraySize) traverseNode((node as VarDeclaration).arraySize, node);
                if ((node as VarDeclaration).value) traverseNode((node as VarDeclaration).value, node);
                break;
            case "VarDeclarationList":
                traverseArray((node as VarDeclarationList).declarations, node);
                break;
            case "ReturnDeclaration":
                if ((node as ReturnDeclaration).value) traverseNode((node as ReturnDeclaration).value, node);
                break;
            case "ConditionalDeclaration":
                traverseNode((node as ConditionalDeclaration).test, node);
                traverseArray((node as ConditionalDeclaration).body, node);
                if ((node as ConditionalDeclaration).alternate) traverseArray((node as ConditionalDeclaration).alternate, node);
                break;
            case "ForLoopDeclaration":
                if ((node as ForLoopDeclaration).init) traverseNode((node as ForLoopDeclaration).init, node);
                if ((node as ForLoopDeclaration).condition) traverseNode((node as ForLoopDeclaration).condition, node);
                if ((node as ForLoopDeclaration).increment) traverseNode((node as ForLoopDeclaration).increment, node);
                traverseArray((node as ForLoopDeclaration).body, node);
                break;
            case "AssignmentExpr":
                traverseNode((node as AssignmentExpr).assigne, node);
                traverseNode((node as AssignmentExpr).value, node);
                break;
            case "BinaryExpr":
                traverseNode((node as BinaryExpr).left, node);
                traverseNode((node as BinaryExpr).right, node);
                break;
            case "ConditionalExpr":
                traverseNode((node as ConditionalExpr).test, node);
                traverseNode((node as ConditionalExpr).consequent, node);
                traverseNode((node as ConditionalExpr).alternate, node);
                break;
            case "UnaryExpr":
                traverseNode((node as UnaryExpr).operand, node);
                break;
            case "CallExpr":
                traverseNode((node as CallExpr).caller, node);
                traverseArray((node as CallExpr).args, node);
                break;
            case "MemberExpr":
                traverseNode((node as MemberExpr).object, node);
                traverseNode((node as MemberExpr).property, node);
                break;
            case "IndexExpr":
                traverseNode((node as IndexExpr).object, node);
                traverseNode((node as IndexExpr).index, node);
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
