import { Buffer } from "../renderer/Buffer";
export declare class DataBackedBuffer<T> {
    readonly buffer: Buffer;
    private data;
    private dataOffsets;
    private dataValues;
    constructor(data: T);
    set(key: keyof T, value: any): void;
    get(key: keyof T): [number, number, number, number];
}
