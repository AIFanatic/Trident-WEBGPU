export class RendererInfo {
    public frame: number = 0;
    public deltaTime: number = 0;
    public fps: number = 0;
    public vertexCount: number = 0;
    public triangleCount: number = 0;
    public visibleTriangles: number = 0;
    public cpuTime: number = 0;
    public bindGroupLayoutsStat: number = 0;
    public bindGroupsStat: number = 0;
    public frameVertexBuffersStat: number = 0;
    public frameIndexBufferStat: number = 0;
    public compiledShadersStat: number = 0;
    public drawCallsStat: number = 0;

    public gpuBufferSizeTotal: number = 0;
    public gpuBufferCount: number = 0;
    public gpuTextureSizeTotal: number = 0;
    public gpuTextureCount: number = 0;

    public visibleObjects: number = 0;
    
    public framePassesStats: Map<string, number> = new Map();

    public SetPassTime(name: string, time: number) {
        this.framePassesStats.set(name, time / 1e6);
    }

    public ResetFrame() {
        this.drawCallsStat = 0;
        this.triangleCount = 0;
        this.vertexCount = 0;
        this.frameVertexBuffersStat = 0;
        this.frameIndexBufferStat = 0;
        this.drawCallsStat = 0;
        this.visibleObjects = 0;
        this.visibleTriangles = 0;
    }
}