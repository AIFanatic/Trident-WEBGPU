import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Compute, Shader } from "../Shader";
import { Geometry, VertexAttribute } from "../../Geometry";
import { Buffer, BufferType } from "../Buffer";
import { Camera } from "../../components/Camera";
import { ComputeContext } from "../ComputeContext";
import { DepthTexture, RenderTexture } from "../Texture";
import { Frustum } from "../../math/Frustum";
import { Debugger } from "../../plugins/Debugger";
import { MeshletMesh } from "../../components/MeshletMesh";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { TextureSampler } from "../TextureSampler";
import { DepthViewer } from "./DepthViewer";
import { TextureViewer } from "./TextureViewer";
import { HiZPass } from "./HiZPass";
import { ShaderCode, Shaders } from "../ShaderCode";

interface SceneMesh {
    geometry: Meshlet;
    mesh: MeshletMesh;
};

const vertexSize = Meshlet.max_triangles * 3;
const workgroupSize = 64;

export class GPUDriven extends RenderPass {
    public name: string = "GPUDriven";
    private shader: Shader;
    private geometry: Geometry;

    private currentMeshCount: number = 0;

    private drawIndirectBuffer: Buffer;
    private compute: Compute;
    private computeDrawBuffer: Buffer;
    private instanceInfoBuffer: Buffer;

    private vertexBuffer: Buffer;

    private cullData: Buffer;
    private frustum: Frustum = new Frustum();

    private visibilityBuffer: Buffer;
    private currentPassBuffer: Buffer;

    private visibleBuffer: Buffer;
    private nonVisibleBuffer: Buffer;


    private hizPass: HiZPass;

    private colorTarget: RenderTexture;

    private depthViewer: DepthViewer;
    private textureViewer: TextureViewer;


    private meshInfoBuffer: Buffer;
    private meshletInfoBuffer: Buffer;
    private objectInfoBuffer: Buffer;

    private depthColorTarget: RenderTexture;
    private depthTexture: DepthTexture;

    constructor() {
        super({});
        this.init();
    }

    protected async init() {
        this.shader = await Shader.Create({
            code: await ShaderCode.Load(Shaders.DrawIndirect),
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                viewMatrix: {group: 0, binding: 0, type: "storage"},
                projectionMatrix: {group: 0, binding: 1, type: "storage"},
                vertices: {group: 0, binding: 2, type: "storage"},
                instanceInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},
                settings: {group: 0, binding: 6, type: "storage"},
            },
        });

        this.compute = await Compute.Create({
            code: await ShaderCode.Load(Shaders.Cull),
            computeEntrypoint: "main",
            uniforms: {
                drawBuffer: {group: 0, binding: 0, type: "storage-write"},
                instanceInfo: {group: 0, binding: 1, type: "storage-write"},
                cullData: {group: 0, binding: 2, type: "storage"},

                meshletInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},

                visibilityBuffer: {group: 0, binding: 6, type: "storage-write"},
                currentPass: {group: 0, binding: 7, type: "storage"},

                textureSampler: {group: 0, binding: 8, type: "sampler"},
                depthTexture: {group: 0, binding: 9, type: "depthTexture"},

                settings: {group: 0, binding: 10, type: "storage"},
            }
        });

        this.drawIndirectBuffer = Buffer.Create(4 * 4, BufferType.INDIRECT);
        this.drawIndirectBuffer.name = "drawIndirectBuffer";

        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertexSize)));

        this.currentPassBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);


        const sampler = TextureSampler.Create({magFilter: "nearest", minFilter: "nearest"});
        this.compute.SetSampler("textureSampler", sampler);
        
        function previousPow2(v: number) {
            let r = 1;
            while (r * 2 < v) r *= 2;
            return r;
        }

        this.hizPass = new HiZPass();

        this.visibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.visibleBuffer.SetArray(new Float32Array([1]));
        this.nonVisibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.nonVisibleBuffer.SetArray(new Float32Array([0]));

        this.colorTarget = RenderTexture.Create(Renderer.width, Renderer.height);
        this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);

        this.depthViewer = new DepthViewer();
        this.textureViewer = new TextureViewer();

        this.initialized = true;
    }

    private buildMeshletData() {
        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];

        if (this.currentMeshCount !== sceneMeshlets.length) {
            const meshlets: SceneMesh[] = [];
            for (const meshlet of sceneMeshlets) {
                for (const geometry of meshlet.meshlets) {
                    meshlets.push({mesh: meshlet, geometry: geometry});
                }
            }

            let meshletInfo: number[] = [];
            let meshInfo: number[] = [];
            let objectInfo: number[] = [];

            let vertices: number[] = [];
            const indexedCache: Map<number, number> = new Map();
            const meshCache: Map<string, number> = new Map();

            for (let i = 0; i < meshlets.length; i++) {
                const sceneMesh = meshlets[i];
                let geometryIndex = indexedCache.get(sceneMesh.geometry.crc);
                if (geometryIndex === undefined) {
                    geometryIndex = indexedCache.size;
                    indexedCache.set(sceneMesh.geometry.crc, geometryIndex);
                    // verticesArray.set(sceneMesh.geometry.vertices, geometryIndex * vertexSize * 4);
                    vertices.push(...sceneMesh.geometry.vertices_gpu);

                    // Meshlet info
                    const meshlet = sceneMesh.geometry;
                    const bv = meshlet.boundingVolume;
                    const pbv = meshlet.boundingVolume;
                    meshletInfo.push(
                        ...bv.cone_apex.elements, 0,
                        ...bv.cone_axis.elements, 0,
                        bv.cone_cutoff, 0, 0, 0,
                        bv.center.x, bv.center.y, bv.center.z, bv.radius,
                        pbv.center.x, pbv.center.y, pbv.center.z, pbv.radius,
                        meshlet.clusterError, 0, 0, 0,
                        meshlet.parentError, 0, 0, 0,
                        meshlet.lod, 0, 0, 0,
                        ...meshlet.bounds.min.elements, 0,
                        ...meshlet.bounds.max.elements, 0
                    )
                }

                // Mesh info
                let meshIndex = meshCache.get(sceneMesh.mesh.id);
                if (meshIndex === undefined) {
                    meshIndex = meshCache.size;
                    meshCache.set(sceneMesh.mesh.id, meshIndex);

                    meshInfo.push(
                        ...sceneMesh.mesh.transform.localToWorldMatrix.elements,
                        ...sceneMesh.mesh.transform.position.elements, 0,
                        ...sceneMesh.mesh.transform.scale.elements, 0,
                    );
                }

                // Object info
                objectInfo.push(
                    meshIndex, geometryIndex, 0, 0,
                )
            }

            // Vertex buffer
            const verticesArray = new Float32Array(vertices);
            console.log("verticesArray", verticesArray.length);


            // Meshlet info buffer
            const meshletInfoArray = new Float32Array(meshletInfo);
            const meshletInfoBuffer = Buffer.Create(meshletInfoArray.byteLength, BufferType.STORAGE);
            meshletInfoBuffer.name = "meshletInfoBuffer";
            meshletInfoBuffer.SetArray(meshletInfoArray);
            this.compute.SetBuffer("meshletInfo", meshletInfoBuffer);

            // Mesh info buffer
            const meshInfoBufferArray = new Float32Array(meshInfo);
            const meshInfoBuffer = Buffer.Create(meshInfoBufferArray.byteLength, BufferType.STORAGE);
            meshInfoBuffer.name = "meshInfoBuffer";
            meshInfoBuffer.SetArray(meshInfoBufferArray);
            this.compute.SetBuffer("meshInfo", meshInfoBuffer);

            // Object info buffer
            const objectInfoBufferArray = new Float32Array(objectInfo);
            const objectInfoBuffer = Buffer.Create(objectInfoBufferArray.byteLength, BufferType.STORAGE);
            objectInfoBuffer.name = "objectInfoBuffer";
            objectInfoBuffer.SetArray(objectInfoBufferArray);
            this.compute.SetBuffer("objectInfo", objectInfoBuffer);

            this.shader.SetBuffer("meshInfo", meshInfoBuffer);
            this.shader.SetBuffer("objectInfo", objectInfoBuffer);

            console.log("meshletInfoBuffer", meshletInfoArray.byteLength);
            console.log("meshInfoBufferArray", meshInfoBufferArray.byteLength);
            console.log("objectInfoBufferArray", objectInfoBufferArray.byteLength);


            this.meshInfoBuffer = meshInfoBuffer;
            this.meshletInfoBuffer = meshletInfoBuffer;
            this.objectInfoBuffer = objectInfoBuffer;


            console.log("verticesArray", verticesArray.length)
            // Vertices buffer
            this.vertexBuffer = Buffer.Create(verticesArray.byteLength, BufferType.STORAGE);
            this.vertexBuffer.name = "vertexBuffer"
            this.vertexBuffer.SetArray(verticesArray);
            this.shader.SetBuffer("vertices", this.vertexBuffer);
            
            this.currentMeshCount = sceneMeshlets.length;
            console.timeEnd("buildMeshletData");

            const visibilityBufferArray = new Float32Array(meshlets.length * 4).fill(1);
            this.visibilityBuffer = Buffer.Create(visibilityBufferArray.byteLength, BufferType.STORAGE_WRITE);
            this.visibilityBuffer.SetArray(visibilityBufferArray);

            this.compute.SetBuffer("visibilityBuffer", this.visibilityBuffer);
            this.compute.SetBuffer("currentPass", this.currentPassBuffer);
            console.log("visibilityBufferArray", visibilityBufferArray.byteLength)

            Debugger.SetTotalMeshlets(meshlets.length);
        }

    }

    private generateDrawsPass(meshletsCount: number, prepass: boolean) {

        if (prepass === true) RendererContext.CopyBufferToBuffer(this.visibleBuffer, this.currentPassBuffer);
        else RendererContext.CopyBufferToBuffer(this.nonVisibleBuffer, this.currentPassBuffer);

        // const workgroupSizeX = Math.floor((meshletsCount + workgroupSize-1) / workgroupSize);
        // const workgroupSizeX = 4;  // Threads per workgroup along X
        // const workgroupSizeY = 4;  // Threads per workgroup along Y
        // const workgroupSizeZ = 1;  // Threads per workgroup along Z

        // Calculate dispatch sizes based on the cube root approximation
        const dispatchSizeX = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(meshletsCount) / 4);

        ComputeContext.BeginComputePass(`GPUDriven - Culling prepass: ${prepass}`, true);
        ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        ComputeContext.EndComputePass();
        RendererContext.CopyBufferToBuffer(this.computeDrawBuffer, this.drawIndirectBuffer);
    }

    private geometryPass(prepass: boolean) {
        const shouldClear = prepass ? true : false;
        RendererContext.BeginRenderPass(`GPUDriven - Indirect prepass: ${prepass}`, [{target: this.colorTarget, clear: shouldClear}], {target: this.depthTexture, clear: shouldClear}, true);
        RendererContext.DrawIndirect(this.geometry, this.shader, this.drawIndirectBuffer);
        RendererContext.EndRenderPass();
    }

    public execute(resources: ResourcePool) {
        if (this.initialized === false) return;
        

        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];
        // const sceneMeshletsInstanced = scene.GetComponents(InstancedMeshlet);
        
        let meshletsCount = 0;
        for (const meshlet of sceneMeshlets) {
            meshletsCount += meshlet.meshlets.length;
        }
        
        if (meshletsCount === 0) return;
        
        this.buildMeshletData();

        
        this.frustum.setFromProjectionMatrix(mainCamera.projectionMatrix);
        this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
        this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);

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
            meshletsCount,0,
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

        // this.isFirstPass = this.isFirstPass === 1 ? 0 : 1;


        if (!this.computeDrawBuffer) {
            // Draw indirect buffer
            this.computeDrawBuffer = Buffer.Create(4 * 4, BufferType.STORAGE_WRITE);
            this.computeDrawBuffer.name = "computeDrawBuffer";
            this.compute.SetBuffer("drawBuffer", this.computeDrawBuffer);

            // InstanceBuffer
            this.instanceInfoBuffer = Buffer.Create(meshletsCount * 1 * 4, BufferType.STORAGE_WRITE);
            this.instanceInfoBuffer.name = "instanceInfoBuffer"
            this.compute.SetBuffer("instanceInfo", this.instanceInfoBuffer);
            this.shader.SetBuffer("instanceInfo", this.instanceInfoBuffer);
        }

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
        this.shader.SetArray("settings", settings);
        this.compute.SetTexture("depthTexture", this.hizPass.debugDepthTexture);

        RendererContext.ClearBuffer(this.computeDrawBuffer);

        this.generateDrawsPass(meshletsCount, true);
        // this.geometryPass(true);

        this.hizPass.buildDepthPyramid(this.shader, this.geometry, this.drawIndirectBuffer);

        this.generateDrawsPass(meshletsCount, false);
        this.drawIndirectBuffer.SetArray(new Uint32Array([Meshlet.max_triangles, meshletsCount, 0, 0]))
        this.geometryPass(true);

        if (Debugger.isDebugDepthPassEnabled) {
            this.depthViewer.execute(resources, this.hizPass.debugDepthTexture, Debugger.debugDepthMipLevel, Debugger.debugDepthExposure);
        }
        else {
            this.textureViewer.execute(resources, this.colorTarget);
        }

        this.computeDrawBuffer.GetData().then(v => {
            const visibleMeshCount = new Uint32Array(v)[1];
            Debugger.SetVisibleMeshes(visibleMeshCount);

            Debugger.SetTriangleCount(vertexSize / 3* meshletsCount);
            Debugger.SetVisibleTriangleCount(vertexSize / 3 * visibleMeshCount);
        })
    }
}