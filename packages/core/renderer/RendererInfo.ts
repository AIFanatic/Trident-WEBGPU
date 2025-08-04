export class RendererInfo {
    public fps: number = 0;
    public triangleCount: number = 0;
    public visibleTriangles: number = 0;
    public cpuTime: number = 0;
    public bindGroupLayoutsStat: number = 0;
    public bindGroupsStat: number = 0;
    public compiledShadersStat: number = 0;
    public drawCallsStat: number = 0;

    public gpuBufferSizeTotal: number = 0;
    public gpuTextureSizeTotal: number = 0;
    
    public framePassesStats: Map<string, number> = new Map();

    public SetPassTime(name: string, time: number) {
        this.framePassesStats.set(name, time / 1e6);
    }

    // private FormatBytes (bytes: number, decimals = 2): {value: number, rank: string} {
    //     const k = 1024;
    //     const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    //     const i = Math.floor(Math.log(bytes) / Math.log(k));
    //     return {value: parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)), rank: sizes[i]};
    // }

    public ResetFrame() {
        this.drawCallsStat = 0;
    }
}