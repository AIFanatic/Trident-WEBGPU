import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Compute } from "../Shader";
import { Buffer, BufferType } from "../Buffer";
import { Camera } from "../../components/Camera";
import { ComputeContext } from "../ComputeContext";
import { Frustum } from "../../math/Frustum";
import { Debugger } from "../../plugins/Debugger";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { TextureSampler } from "../TextureSampler";
import { HiZPass } from "./HiZPass";
import { ShaderLoader } from "../ShaderUtils";
import { PassParams } from "../RenderingPipeline";
import { IndirectGBufferPass } from "./IndirectGBufferPass";
import { TextureMaps } from "./PrepareSceneData";

export class CullingPass extends RenderPass {
    public name: string = "CullingPass";

    private drawIndirectBuffer: Buffer;
    private compute: Compute;

    private cullData: Buffer;
    private frustum: Frustum = new Frustum();

    private currentPassBuffer: Buffer;

    private visibleBuffer: Buffer;
    private nonVisibleBuffer: Buffer;

    private visibilityBuffer: Buffer;
    private instanceInfoBuffer: Buffer;


    // TODO: To split this ones (into RenderPipeline) need to change the RenderGraph to have a setup phase
    // because the HiZPass depthPyramid only runs after CullingPass has run.
    private hizPass: HiZPass;
    private indirectGBufferPass: IndirectGBufferPass;

    constructor() {
        super({
            inputs: [
                PassParams.indirectVertices, PassParams.indirectMeshInfo, PassParams.indirectMeshletInfo,
                PassParams.indirectObjectInfo, PassParams.meshletsCount
            ],
            outputs: [
                PassParams.indirectDrawBuffer,
                PassParams.indirectInstanceInfo,
                PassParams.isCullingPrepass,

                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
                PassParams.GBufferDepth
            ]
        });
        this.init();
    }

    protected async init() {
        this.compute = await Compute.Create({
            code: await ShaderLoader.Cull,
            computeEntrypoint: "main",
            uniforms: {
                drawBuffer: {group: 0, binding: 0, type: "storage-write"},
                instanceInfo: {group: 0, binding: 1, type: "storage-write"},
                cullData: {group: 0, binding: 2, type: "storage"},

                meshletInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},

                visibilityBuffer: {group: 0, binding: 6, type: "storage-write"},
                bPrepass: {group: 0, binding: 7, type: "storage"},

                textureSampler: {group: 0, binding: 8, type: "sampler"},
                depthTexture: {group: 0, binding: 9, type: "depthTexture"},

                settings: {group: 0, binding: 10, type: "storage"},
            }
        });

        this.drawIndirectBuffer = Buffer.Create(4 * 4, BufferType.INDIRECT);
        this.drawIndirectBuffer.name = "drawIndirectBuffer";
        this.compute.SetBuffer("drawBuffer", this.drawIndirectBuffer);

        this.currentPassBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);


        const sampler = TextureSampler.Create({magFilter: "nearest", minFilter: "nearest"});
        this.compute.SetSampler("textureSampler", sampler);

        this.hizPass = new HiZPass();
        this.indirectGBufferPass = new IndirectGBufferPass();

        this.visibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.visibleBuffer.SetArray(new Float32Array([1]));
        this.nonVisibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.nonVisibleBuffer.SetArray(new Float32Array([0]));

        this.initialized = true;
    }

    private generateDrawsPass(meshletsCount: number, prepass: boolean) {

        // if (prepass === true) RendererContext.CopyBufferToBuffer(this.visibleBuffer, this.currentPassBuffer);
        // else RendererContext.CopyBufferToBuffer(this.nonVisibleBuffer, this.currentPassBuffer);

        // const workgroupSizeX = Math.floor((meshletsCount + workgroupSize-1) / workgroupSize);
        // const workgroupSizeX = 4;  // Threads per workgroup along X
        // const workgroupSizeY = 4;  // Threads per workgroup along Y
        // const workgroupSizeZ = 1;  // Threads per workgroup along Z

        // Calculate dispatch sizes based on the cube root approximation
        const dispatchSizeX = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(meshletsCount) / 4);

        ComputeContext.BeginComputePass(`Culling - prepass: ${+prepass}`, true);
        ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        ComputeContext.EndComputePass();
    }

    public execute(resources: ResourcePool, inputIndirectVertices: Buffer, inputIndirectMeshInfo: Buffer, inputIndirectMeshletInfo: Buffer, inputIndirectObjectInfo: Buffer, inputMeshletsCount: number, outputIndirectDrawBuffer: string, outputIndirectInstanceInfo: string, outputIsCullingPrepass: string) {
        // const argsK: typeof PassParams = Object.fromEntries(args.map(item => [item, item]))
        if (this.initialized === false) return;
        if (this.hizPass.initialized === false) return;
        if (this.indirectGBufferPass.initialized === false) return;
        

        const mainCamera = Camera.mainCamera;
        
        // const meshletsCount = this.gpuDrivenDataManager.processSceneMeshes();
        if (inputMeshletsCount === 0) return;

        if (!this.visibilityBuffer) {
            const visibilityBufferArray = new Float32Array(inputMeshletsCount * 4).fill(1);
            this.visibilityBuffer = Buffer.Create(visibilityBufferArray.byteLength, BufferType.STORAGE_WRITE);
            this.visibilityBuffer.SetArray(visibilityBufferArray);
        }
        if (!this.instanceInfoBuffer) {
            this.instanceInfoBuffer = Buffer.Create(inputMeshletsCount * 1 * 4, BufferType.STORAGE_WRITE);
            this.instanceInfoBuffer.name = "instanceInfoBuffer"
        }

        


        this.compute.SetBuffer("meshletInfo", inputIndirectMeshletInfo);
        this.compute.SetBuffer("meshInfo", inputIndirectMeshInfo);
        this.compute.SetBuffer("objectInfo", inputIndirectObjectInfo);
        this.compute.SetBuffer("instanceInfo", this.instanceInfoBuffer);
        this.compute.SetBuffer("visibilityBuffer", this.visibilityBuffer);

        
        this.frustum.setFromProjectionMatrix(mainCamera.projectionMatrix);

        const cullDataArray = new Float32Array([
            ...mainCamera.projectionMatrix.elements,
            ...mainCamera.viewMatrix.elements,
            ...mainCamera.transform.position.elements, 0,
            ...this.frustum.planes[0].normal.elements, this.frustum.planes[0].constant,
            ...this.frustum.planes[1].normal.elements, this.frustum.planes[1].constant,
            ...this.frustum.planes[2].normal.elements, this.frustum.planes[2].constant,
            ...this.frustum.planes[3].normal.elements, this.frustum.planes[3].constant,
            ...this.frustum.planes[4].normal.elements, this.frustum.planes[4].constant,
            ...this.frustum.planes[5].normal.elements, this.frustum.planes[5].constant,
            inputMeshletsCount, 0,
            Renderer.width, Renderer.height,0,0,
            mainCamera.near, mainCamera.far,
            ...mainCamera.projectionMatrix.clone().transpose().elements,
        ])
        if (!this.cullData) {
            this.cullData = Buffer.Create(cullDataArray.byteLength, BufferType.STORAGE);
            this.cullData.name = "cullData";
            this.compute.SetBuffer("cullData", this.cullData);
        }
        this.cullData.SetArray(cullDataArray);

        const settings = new Float32Array([
            +Debugger.isFrustumCullingEnabled,
            +Debugger.isBackFaceCullingEnabled,
            +Debugger.isOcclusionCullingEnabled,
            +Debugger.isSmallFeaturesCullingEnabled,
            Debugger.staticLOD,
            Debugger.dynamicLODErrorThreshold,
            +Debugger.isDynamicLODEnabled,
            +Debugger.viewInstanceColors,
            Meshlet.max_triangles,
            0, 0, 0
        ]);
        this.compute.SetArray("settings", settings);


        






        this.compute.SetTexture("depthTexture", this.hizPass.debugDepthTexture);



        this.compute.SetBuffer("bPrepass", this.currentPassBuffer);


        const textureMaps: TextureMaps = resources.getResource(PassParams.textureMaps);
        RendererContext.ClearBuffer(this.drawIndirectBuffer);
        RendererContext.CopyBufferToBuffer(this.visibleBuffer, this.currentPassBuffer);
        this.generateDrawsPass(inputMeshletsCount, true);
        this.indirectGBufferPass.execute(resources, inputIndirectVertices, this.instanceInfoBuffer, inputIndirectMeshInfo, inputIndirectObjectInfo, this.drawIndirectBuffer, textureMaps, true, PassParams.depthTexture, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth);

        this.hizPass.execute(resources, this.indirectGBufferPass.depthTexture, PassParams.depthTexturePyramid);
        RendererContext.ClearBuffer(this.drawIndirectBuffer);
        RendererContext.CopyBufferToBuffer(this.nonVisibleBuffer, this.currentPassBuffer);
        this.generateDrawsPass(inputMeshletsCount, false);
        this.indirectGBufferPass.execute(resources, inputIndirectVertices, this.instanceInfoBuffer, inputIndirectMeshInfo, inputIndirectObjectInfo, this.drawIndirectBuffer, textureMaps, false, PassParams.depthTexture, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth);


        resources.setResource(outputIndirectDrawBuffer, this.drawIndirectBuffer);
        resources.setResource(outputIndirectInstanceInfo, this.instanceInfoBuffer);

        let prepass = resources.getResource(outputIsCullingPrepass);
        if (prepass === undefined) prepass = false;
        else prepass = !prepass;
        resources.setResource(outputIsCullingPrepass, prepass);
        // resources.setResource(outputIsCullingPrepass, outputIsCullingPrepass);

        this.drawIndirectBuffer.GetData().then(v => {
            const visibleMeshCount = new Uint32Array(v)[1];
            Debugger.SetVisibleMeshes(visibleMeshCount);

            Debugger.SetTriangleCount(Meshlet.max_triangles * inputMeshletsCount);
            Debugger.SetVisibleTriangleCount(Meshlet.max_triangles * visibleMeshCount);
        })
    }
}