export type ArrayType = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array;
export declare class WASMPointer {
    data: ArrayType;
    ptr: number | null;
    type: "in" | "out";
    constructor(data: ArrayType, type?: "in" | "out");
}
export declare class WASMHelper {
    static TYPES: {
        i8: {
            array: Int8ArrayConstructor;
            heap: string;
        };
        i16: {
            array: Int16ArrayConstructor;
            heap: string;
        };
        i32: {
            array: Int32ArrayConstructor;
            heap: string;
        };
        f32: {
            array: Float32ArrayConstructor;
            heap: string;
        };
        f64: {
            array: Float64ArrayConstructor;
            heap: string;
        };
        u8: {
            array: Uint8ArrayConstructor;
            heap: string;
        };
        u16: {
            array: Uint16ArrayConstructor;
            heap: string;
        };
        u32: {
            array: Uint32ArrayConstructor;
            heap: string;
        };
    };
    static getTypeForArray(array: ArrayType): {
        array: Int8ArrayConstructor;
        heap: string;
    } | {
        array: Int16ArrayConstructor;
        heap: string;
    } | {
        array: Int32ArrayConstructor;
        heap: string;
    } | {
        array: Float32ArrayConstructor;
        heap: string;
    } | {
        array: Float64ArrayConstructor;
        heap: string;
    } | {
        array: Uint8ArrayConstructor;
        heap: string;
    } | {
        array: Uint16ArrayConstructor;
        heap: string;
    } | {
        array: Uint32ArrayConstructor;
        heap: string;
    };
    static transferNumberArrayToHeap(module: any, array: any): number;
    static getDataFromHeapU8(module: any, address: number, type: any, length: number): any;
    static getDataFromHeap(module: any, address: number, type: any, length: number): any;
    static getArgumentTypes(args: any[]): string[];
    private static transferArguments;
    private static getOutputArguments;
    static call(module: any, method: string, returnType: string, ...args: any[]): any;
}
//# sourceMappingURL=WASMHelper.d.ts.map