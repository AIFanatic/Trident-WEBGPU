import { Debugger } from "../../plugins/Debugger";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTimestampQuery {
    private static querySet: GPUQuerySet;
    private static resolveBuffer: GPUBuffer;
    private static resultBuffer: GPUBuffer;
    private static isTimestamping = false;

    private static links: Map<number, string> = new Map();
    private static currentLinkIndex: number = 0;

    public static BeginRenderTimestamp(name: string): GPURenderPassTimestampWrites | GPUComputePassTimestampWrites {
        if (this.isTimestamping === true) throw Error("Already timestamping");
        if (!this.querySet) {
            this.querySet = WEBGPURenderer.device.createQuerySet({
                type: 'timestamp',
                count: 200,
             });
        }
        if (!this.resolveBuffer) {
            this.resolveBuffer = WEBGPURenderer.device.createBuffer({
                size: this.querySet.count * 8,
                usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
            })
        }
        if (!this.resultBuffer) {
            this.resultBuffer = WEBGPURenderer.device.createBuffer({
                size: this.querySet.count * 8,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            })
        }
        this.isTimestamping = true;
        const currentLinkIndex = this.currentLinkIndex;
        this.currentLinkIndex+=2;
        this.links.set(currentLinkIndex, name);
        return {querySet: this.querySet, beginningOfPassWriteIndex: currentLinkIndex, endOfPassWriteIndex: currentLinkIndex+1};

    }

    public static EndRenderTimestamp() {
        if (this.isTimestamping === false) return;

        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");

        if (this.resultBuffer.mapState === 'unmapped') {
            activeCommandEncoder.resolveQuerySet(this.querySet, 0, this.querySet.count, this.resolveBuffer, 0);
            activeCommandEncoder.copyBufferToBuffer(this.resolveBuffer, 0, this.resultBuffer, 0, this.resultBuffer.size);
        }

        this.isTimestamping = false;
    }

    public static async GetResult() {
        if (!this.resultBuffer || this.resultBuffer.mapState !== "unmapped") return;

        await this.resultBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = this.resultBuffer.getMappedRange().slice(0);
        const times = new BigInt64Array(arrayBuffer);

        // console.log(times)

        let visited = {};
        let str = ``;
        for (let i = 0; i < this.currentLinkIndex; i+=2) {
            const link = this.links.get(i);
            if (!link) throw Error("ERGERG");
            if (visited[link] === true) continue;

            // console.log(times)
            const duration = Number(times[i+1] - times[i]);
            

            str += `${link}: ${(duration / 1000).toFixed(1)}µs\n`;
            visited[link] = true;
            // console.log(`${(duration / 1000).toFixed(1)}µs`);
        }
        Debugger.SetGPUTime(str)

        this.resultBuffer.unmap();

        this.currentLinkIndex = 0;
        this.links.clear();
    }
}