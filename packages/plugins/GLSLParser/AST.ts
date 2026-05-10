export type NodeType =
    | "Program"
    | "PrecisionDeclaration"
    | "VarDeclaration"
    | "VarDeclarationList"
    | "FunctionDeclaration"
    | "ExpressionStatement"
    | "ReturnDeclaration"
    | "ConditionalDeclaration"
    | "ForLoopDeclaration"
    | "AssignmentExpr"
    | "BinaryExpr"
    | "ConditionalExpr"
    | "UnaryExpr"
    | "CallExpr"
    | "MemberExpr"
    | "IndexExpr"
    | "NumericLiteral"
    | "BooleanLiteral"
    | "Identifier";

export interface Stmt {
    kind: NodeType;
    _context?: {
        body: Stmt[];
        globals: Stmt[];
        counters?: {
            binding: number;
            location: number;
        };
    };
}

export interface Program extends Stmt {
    kind: "Program";
    body: Stmt[];
    globals?: Stmt[];
    counters?: {
        binding: number;
        location: number;
    };
}

export interface PrecisionDeclaration extends Stmt {
    kind: "PrecisionDeclaration";
    precision: string;
    type: string;
}

export interface VarDeclaration extends Stmt {
    kind: "VarDeclaration";
    qualifier?: string;
    type: string;
    identifier: string;
    value?: Expr;
    arraySize?: Expr;
}

export interface VarDeclarationList extends Stmt {
    kind: "VarDeclarationList";
    declarations: VarDeclaration[];
}

export interface FunctionDeclaration extends Stmt {
    kind: "FunctionDeclaration";
    type: string;
    name: string;
    parameters: VarDeclaration[];
    body: Stmt[];
}

export interface ExpressionStatement extends Stmt {
    kind: "ExpressionStatement";
    expression: Expr;
}

export interface ReturnDeclaration extends Stmt {
    kind: "ReturnDeclaration";
    value?: Expr;
}

export interface ConditionalDeclaration extends Stmt {
    kind: "ConditionalDeclaration";
    test: Expr;
    body: Stmt[];
    alternate?: Stmt[];
}

export interface ForLoopDeclaration extends Stmt {
    kind: "ForLoopDeclaration";
    init?: Stmt;
    condition?: Expr;
    increment?: Expr;
    body: Stmt[];
}

export interface Expr extends Stmt {}

export interface AssignmentExpr extends Expr {
    kind: "AssignmentExpr";
    assigne: Expr;
    value: Expr;
    operator: string;
}

export interface BinaryExpr extends Expr {
    kind: "BinaryExpr";
    left: Expr;
    right: Expr;
    operator: string;
}

export interface ConditionalExpr extends Expr {
    kind: "ConditionalExpr";
    test: Expr;
    consequent: Expr;
    alternate: Expr;
}

export interface UnaryExpr extends Expr {
    kind: "UnaryExpr";
    operand: Expr;
    operator: string;
    prefix: boolean;
}

export interface CallExpr extends Expr {
    kind: "CallExpr";
    caller: Expr;
    args: Expr[];
}

export interface MemberExpr extends Expr {
    kind: "MemberExpr";
    object: Expr;
    property: Identifier;
}

export interface IndexExpr extends Expr {
    kind: "IndexExpr";
    object: Expr;
    index: Expr;
}

export interface Identifier extends Expr {
    kind: "Identifier";
    symbol: string;
}

export interface NumericLiteral extends Expr {
    kind: "NumericLiteral";
    value: string;
}

export interface BooleanLiteral extends Expr {
    kind: "BooleanLiteral";
    value: boolean;
}
