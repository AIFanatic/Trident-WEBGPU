type ResponseType<T> = T extends 'json' ? object : T extends 'text' ? string : T extends 'binary' ? ArrayBuffer : never;
export declare class Assets {
    private static cache;
    static Load<T extends "json" | "text" | "binary">(url: string, type: T): Promise<ResponseType<T>>;
}
export {};
