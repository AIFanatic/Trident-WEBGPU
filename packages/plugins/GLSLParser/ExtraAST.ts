import { Expr, NodeType, VarDeclaration } from "./AST";

export type ExtraNodeType =
    | NodeType
    | "UniformDeclaration"
    | "LocationDeclaration";

export interface Stmt<K extends NodeType | ExtraNodeType> {
    kind: K;
}

export interface NewStmt extends Stmt<NodeType | ExtraNodeType> {}

export interface UniformDeclaration extends NewStmt {
    kind: "UniformDeclaration";
    binding: number;
    identifier: string;
    type: string;
    arraySize?: Expr;
}

export interface LocationDeclaration extends NewStmt {
    kind: "LocationDeclaration";
    location: number;
    qualifier: string;
    value: VarDeclaration;
}
