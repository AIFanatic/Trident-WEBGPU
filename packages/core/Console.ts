export interface ConsoleVarOptions<T> {
    name: string;
    help: string;
    default: T;
    onChange?: (value: T, oldValue: T) => void;
}

export class ConsoleVar<T> {
    readonly name: string;
    readonly help: string;
    private _value: T;
    private readonly _onChange?: (v: T, old: T) => void;

    constructor(opts: ConsoleVarOptions<T>) {
        this.name = opts.name;
        this.help = opts.help;
        this._value = opts.default;
        this._onChange = opts.onChange;
    }

    get value(): T {
        return this._value;
    }

    set value(next: T) {
        const old = this._value;
        if (old === next) return;
        this._value = next;
        this._onChange?.(next, old);
    }
}

type ConsoleVarConfig<T> = {
    default: T;
    help: string;
    onChange?: (value: T, oldValue: T) => void;
};

export type ConsoleVarConfigs = Record<string, ConsoleVarConfig<any>>;

class ConsoleManager {
    private vars: {[key: string]: ConsoleVar<any>} = {};

    private defineVar<T>(opts: ConsoleVarOptions<T>): ConsoleVar<T> {
        const key = opts.name.toLowerCase();
        const variable = new ConsoleVar(opts);
        this.vars[key] = variable;
        return variable;
    }

    public getVar<T>(name: string): ConsoleVar<T> | undefined {
        return this.vars[name.toLowerCase()];
    }

    public define<const Defs extends ConsoleVarConfigs>(defs: Defs): { [K in keyof Defs]: ConsoleVar<Defs[K]["default"]> } {
        const result = {} as { [K in keyof Defs]: ConsoleVar<Defs[K]["default"]> };

        for (const key in defs) {
            const def = defs[key];
            const variable = this.defineVar({
                name: key,
                help: def.help,
                default: def.default,
                onChange: def.onChange,
            });
            // runtime is fine; TS just needs a little nudge
            result[key] = variable as any;
        }

        return result;
    }
}

export const Console = new ConsoleManager();
globalThis["Console"] = Console;