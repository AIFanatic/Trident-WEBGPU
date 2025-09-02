import { Component } from "../components";

export class SerializableFieldsMap {
    private fields: Map<string, boolean> = new Map();

    public set(component: Component, property: string) {
        this.fields.set(`${component.constructor.name}-${property}`, true);
    }

    public get(component: Component, property: string): boolean {
        return this.fields.get(`${component.constructor.name}-${property}`);
    }

    public has(component: Component, property: string): boolean {
        return this.fields.has(`${component.constructor.name}-${property}`);
    }
}

export const SerializableFields: SerializableFieldsMap = new SerializableFieldsMap();

export function SerializeField(value: any, context: any);
export function SerializeField(value: unknown, context: ClassMemberDecoratorContext) {
    context.enumerable = true;
    // Register a per-instance initializer so we can access `this`
    context.addInitializer(function (this: Component) {
      SerializableFields.set(this, context.name);
    });
  
    // For fields, don’t return anything (keeps initializer unchanged).
    if (context.kind === "field") {
      return; // no-op, preserve original initializer
    }
  
    // For methods/getters/setters/accessors, preserve original implementation
    return value;
  }

console.log(SerializableFields)