import { Buffer, BufferType } from "../renderer/Buffer";
export class DataBackedBuffer {
    buffer;
    data;
    dataOffsets;
    dataValues;
    constructor(data) {
        this.data = data;
        const dataOffsets = new Map();
        const dataValues = [];
        let offset = 0;
        for (const key in data) {
            dataOffsets.set(key, offset);
            // @ts-ignore
            dataValues.push(data[key]);
            // @ts-ignore
            offset += data[key].length;
        }
        this.dataOffsets = dataOffsets;
        this.dataValues = new Float32Array(dataValues.flat(Infinity));
        this.buffer = Buffer.Create(this.dataValues.length * 4, BufferType.STORAGE);
        this.buffer.SetArray(this.dataValues);
    }
    set(key, value) {
        this.data[key] = value;
        // @ts-ignore
        const offset = this.dataOffsets.get(key);
        if (offset === undefined)
            throw Error("Could not find offset");
        this.dataValues.set(value, offset);
        this.buffer.SetArray(this.dataValues);
    }
    get(key) {
        // @ts-ignore
        return this.data[key];
    }
}
//# sourceMappingURL=DataBackedBuffer.js.map