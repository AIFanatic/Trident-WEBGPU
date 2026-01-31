const SERIAL_FIELDS = Symbol("serial_fields");

export function SerializeField(value: any, context: any);
export function SerializeField(_v: any, context: ClassFieldDecoratorContext) {
    context.addInitializer(function () {
        const proto = Object.getPrototypeOf(this); // declaring class prototype for this field
        const arr: (string | symbol)[] = proto[SERIAL_FIELDS] ?? (proto[SERIAL_FIELDS] = []);
        if (!arr.includes(context.name)) arr.push(context.name);
    });
}

export function GetSerializedFields(classInstance): (string | symbol)[] {
    const proto = Object.getPrototypeOf(classInstance);
    const own = ((proto as any)[SERIAL_FIELDS] ?? []) as (string | symbol)[];
    const base = ((Object.getPrototypeOf(proto) as any)?.[SERIAL_FIELDS] ?? []) as (string | symbol)[];
    return own.filter(f => !base.includes(f));
}