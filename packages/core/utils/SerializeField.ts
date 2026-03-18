const SERIAL_FIELDS = Symbol("serial_fields");

export interface FieldInfo {
    name: string | symbol;
    type: Function;
};

function addField(instance: object, name: string | symbol, type?: Function) {
    const proto = Object.getPrototypeOf(instance);
    const arr: FieldInfo[] = proto[SERIAL_FIELDS] ?? (proto[SERIAL_FIELDS] = []);
    if (!arr.some(f => f.name === name)) {
        arr.push({ name, type: type ?? instance[name]?.constructor });
    }
}

// @SerializeField — no parens, infers type from value
export function SerializeField(_v: any, context: ClassFieldDecoratorContext): void;
// @SerializeField(Texture) — with parens, explicit type hint
export function SerializeField(typeHint: Function): (_v: any, context: ClassFieldDecoratorContext) => void;
export function SerializeField(first: any, second?: ClassFieldDecoratorContext) {
    // @SerializeField (no parens) — second arg is the context
    if (second && typeof second === "object" && second.addInitializer) {
        second.addInitializer(function () { addField(this, second.name); });
        return;
    }
    // @SerializeField(Texture) — first arg is the type hint, return a decorator
    const typeHint = first as Function;
    return function (_v: any, context: ClassFieldDecoratorContext) {
        context.addInitializer(function () { addField(this, context.name, typeHint); });
    };
}

export function GetSerializedFields(classInstance: object): FieldInfo[] {
    const proto = Object.getPrototypeOf(classInstance);
    return ((proto as any)[SERIAL_FIELDS] ?? []) as FieldInfo[];
}