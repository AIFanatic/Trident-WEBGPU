import { Buffer, BufferType } from "../renderer/Buffer";

export class DataBackedBuffer<T> {
    public readonly buffer: Buffer;

    private data: T;
    private dataOffsets: Map<string, number>;
    private dataValues: Float32Array;

    constructor(data: T) {
        this.data = data;
        const dataOffsets: Map<string, number> = new Map();
        const dataValues: number[] = [];
        let offset = 0;
        for (const key in data) {
            dataOffsets.set(key, offset);
            dataValues.push(data[key]);
            offset += data[key].length;
        }

        this.dataOffsets = dataOffsets;
        this.dataValues = new Float32Array(dataValues.flat(Infinity));
        this.buffer = Buffer.Create(this.dataValues.length * 4, BufferType.STORAGE);
        this.buffer.SetArray(this.dataValues);
    }

    public set(key: keyof T, value: any) {
        this.data[key] = value;
        const offset = this.dataOffsets.get(key);
        if (offset === undefined) throw Error("Could not find offset");
        this.dataValues.set(value, offset);
        this.buffer.SetArray(this.dataValues);
    }

    public get(key: keyof T): [number, number, number, number] {
        return this.data[key];
    }
}