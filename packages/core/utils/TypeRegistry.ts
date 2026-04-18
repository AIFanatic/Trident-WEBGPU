// Because js we need a serializable string to constructor
// Eg: @trident/core/components/Mesh -> ctor Mesh()
export const TypeRegistry: Map<string, new (...args: any) => any> = new Map();