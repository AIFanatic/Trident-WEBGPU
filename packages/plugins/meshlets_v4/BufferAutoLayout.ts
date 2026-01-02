type Slot = { n: number; view: "f32" | "u32" | "i32" };

export const f32 = { n: 1, view: "f32" } as const;
export const u32 = { n: 1, view: "u32" } as const;
export const i32 = { n: 1, view: "i32" } as const;

export const vec2u = { n: 2, view: "u32" } as const;
export const vecfu = { n: 2, view: "f32" } as const;

export const vec4u = { n: 4, view: "u32" } as const;
export const vec4f = { n: 4, view: "f32" } as const;
export const mat4f = { n: 16, view: "f32" } as const;

export function BufferAutoLayout<T extends Record<string, Slot>>(spec: T) {
    let offset = 0;
    const buffer = new ArrayBuffer(
        Object.values(spec).reduce((s, v) => s + v.n, 0) * 4
    );

    const views = {} as {
        [K in keyof T]:
        T[K]["view"] extends "u32" ? Uint32Array :
        T[K]["view"] extends "i32" ? Int32Array :
        Float32Array;
    };

    for (const k in spec) {
        const { n, view } = spec[k];
        views[k] =
            view === "u32"
                ? new Uint32Array(buffer, offset * 4, n)
                : view === "i32"
                    ? new Int32Array(buffer, offset * 4, n)
                    : new Float32Array(buffer, offset * 4, n) as any;

        offset += n;
    }

    return { buffer, views };
}