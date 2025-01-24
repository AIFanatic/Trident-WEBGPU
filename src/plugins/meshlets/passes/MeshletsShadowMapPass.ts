import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
import { Shader } from "../../../renderer/Shader";
import { Buffer, BufferType, DynamicBuffer } from "../../../renderer/Buffer";
import { PassParams } from "../../../renderer/RenderingPipeline";
import { ShaderLoader } from "../../../renderer/ShaderUtils";

import WGSL_Shader_Draw_Indirect_Shadows_URL from "../../../renderer/webgpu/shaders/deferred/DrawIndirectShadows.wgsl";
import { AreaLight, DirectionalLight, PointLight, SpotLight } from "../../../components/Light";
import { Camera } from "../../../components/Camera";
import { RendererContext } from "../../../renderer/RendererContext";
import { MeshletPassParams } from "./MeshletDraw";
import { Geometry, VertexAttribute } from "../../../Geometry";
import { Meshlet } from "../Meshlet";
import { MeshletMesh } from "../MeshletMesh";
import { Matrix4 } from "../../../math/Matrix4";
import { Vector3 } from "../../../math/Vector3";
import { Vector4 } from "../../../math/Vector4";

export let lightsCSMProjectionMatrix: Float32Array[] = [];

const getWorldSpaceCorners = (camera: Camera, zNearPercentage: number, zFarPercentage: number) => {
    // Camera view projection
    const invViewProj = camera.projectionMatrix.clone().mul(camera.viewMatrix).invert();

    // console.log(camera.projectionMatrix.elements)
    // console.log("camera viewMatrix", camera.viewMatrix.elements);
    // console.log("camera view projection", camera.projectionMatrix.clone().mul(camera.viewMatrix).elements);
    // console.log("invViewProj", invViewProj.elements)
    // throw Error("ERGERG")
    const result: Vector3[] = [];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const viewSpaceZFarPercentage = new Vector4(0, 0, -lerp(camera.near, camera.far, zFarPercentage), 1).applyMatrix4(camera.projectionMatrix);
    const scaleFarZ = viewSpaceZFarPercentage.z / viewSpaceZFarPercentage.w;
    
    
    const viewSpaceZNearPercentage = new Vector4(0, 0, -lerp(camera.near, camera.far, zNearPercentage), 1).applyMatrix4(camera.projectionMatrix);
    const scaleNearZ = viewSpaceZNearPercentage.z / viewSpaceZNearPercentage.w;

    for (let x = -1; x <= 1; x += 2) {
        for (let y = -1; y <= 1; y += 2) {
            for (let z = 0; z <= 1; z += 1) {
                let corner = new Vector4(x, y, z === 0 ? scaleNearZ : scaleFarZ, 1.0).applyMatrix4(invViewProj);
                let v3corner = new Vector3(corner.x / corner.w, corner.y / corner.w, corner.z / corner.w);

                result.push(v3corner);
            }
        }
    }
    return result;
}

const getLightViewProjections = (camera: Camera, lightDirection: Vector3, numOfCascades: number, assignmentExponent: number, shadowDepthPercentage: number, zMult: number): Matrix4[] => {
    if (camera == null) {
        return [new Matrix4()];
    }
    let f = (x: number) => Math.pow(x, assignmentExponent);
    
    const cascadesViewProjections: Matrix4[] = [];
    
    for (let i = 0; i < numOfCascades; ++i) {
        let corners = getWorldSpaceCorners(camera, shadowDepthPercentage * f(i / (numOfCascades - 1)), shadowDepthPercentage * f((i + 1) / (numOfCascades - 1)));
        const center = corners[0].clone();
        for (let i = 1; i < 8; ++i) {
            center.add(corners[i]);
        }
        center.mul(1/8);

        // view matrix: look at in the direction of the light
        const viewPos = center.clone().add(lightDirection);
        const viewMatrix = new Matrix4().lookAt(center, viewPos, new Vector3(0, 1, 0));

        // projection matrix: ortho that takes
        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;

        for (let i = 0; i < 8; ++i) {
            const viewSpaceCorner = corners[i].clone().applyMatrix4(viewMatrix);
            minX = Math.min(viewSpaceCorner.x, minX);
            minY = Math.min(viewSpaceCorner.y, minY);
            minZ = Math.min(viewSpaceCorner.z, minZ);
            maxX = Math.max(viewSpaceCorner.x, maxX);
            maxY = Math.max(viewSpaceCorner.y, maxY);
            maxZ = Math.max(viewSpaceCorner.z, maxZ);
        }

        
        if (minZ < 0) minZ *= zMult; // become even more negative :)
        else minZ /= zMult; // reduce value
    
        if (maxZ < 0) maxZ /= zMult; // become less negative :)
        else maxZ *= zMult; // increase value

    
        const projMatrix = new Matrix4().orthoZO(minX, maxX, minY, maxY, minZ, maxZ);
        
        const result = projMatrix.clone().mul(viewMatrix);

        cascadesViewProjections.push(result);
    }

    // if (!this.followCameraFrustum && this.lastViewProjections != null) {
    //     return this.lastViewProjections;
    // }

    // this.lastViewProjections = cascadesViewProjections;
    return cascadesViewProjections;
}

export class MeshletsShadowMapPass extends RenderPass {
    public name: string = "MeshletsShadowMapPass";

    private drawIndirectShadowShader: Shader;

    private lightProjectionMatrixBuffer: Buffer;
    private lightProjectionViewMatricesBuffer: Buffer;

    private cascadeIndexBuffers: Buffer[] = [];
    private cascadeCurrentIndexBuffer: Buffer;

    private meshletGeometry: Geometry;

    constructor() {
        super({
            inputs: [
                PassParams.MainCamera,
                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
                PassParams.ShadowPassDepth
            ], 
            outputs: [
            ]
        });
    }

    public async init(resources: ResourcePool) {
        this.drawIndirectShadowShader = await Shader.Create({
            code: await ShaderLoader.Load(WGSL_Shader_Draw_Indirect_Shadows_URL),
            colorOutputs: [],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 1, type: "storage"},
                instanceInfo: {group: 0, binding: 2, type: "storage"},
                meshMatrixInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},

                vertices: {group: 0, binding: 7, type: "storage"},
                cascadeIndex: {group: 0, binding: 8, type: "storage"},
            },
            cullMode: "none"
        });

        this.meshletGeometry = new Geometry();
        this.meshletGeometry.attributes.set("position", new VertexAttribute(new Float32Array(Meshlet.max_triangles * 3)));

        this.initialized = true;
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;


        const scene = Camera.mainCamera.gameObject.scene;

        const meshlets = scene.GetComponents(MeshletMesh);
        if (meshlets.length === 0) return;

        // const lights = scene.GetComponents(Light);
        // TODO: Fix, GetComponents(Light)
        const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
        if (lights.length === 0) {
            return;
        }

        // Lights

        // if (!this.lightProjectionMatricesBuffer || this.lightProjectionMatricesBuffer.size / 4 / 16 !== lights.length) {
        //     this.lightProjectionMatricesBuffer = Buffer.Create(lights.length * 4 * 16, BufferType.STORAGE);
        // }

        const numOfCascades = 4;
        const assignmentExponent = 2.5;
        const shadowDepthPercentage = 1.0;
        const zMult = 10;

        if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
            this.lightProjectionViewMatricesBuffer = Buffer.Create(lights.length * numOfCascades * 4 * 16, BufferType.STORAGE);
        }

        if (!this.cascadeCurrentIndexBuffer) {
            this.cascadeCurrentIndexBuffer = Buffer.Create(4, BufferType.STORAGE);
        }

        if (this.cascadeIndexBuffers.length === 0) {
            for (let i = 0; i < numOfCascades; i++) {
                const buffer = Buffer.Create(4, BufferType.STORAGE)
                buffer.SetArray(new Float32Array([i]));
                this.cascadeIndexBuffers.push(buffer);
            }
        }
        lightsCSMProjectionMatrix = [];
        if (!this.lightProjectionMatrixBuffer) {
            this.lightProjectionMatrixBuffer = Buffer.Create(lights.length * 4 * 4 * 16, BufferType.STORAGE);
            this.drawIndirectShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
        }

        if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
            this.lightProjectionViewMatricesBuffer = Buffer.Create(lights.length * 4 * 4 * 16, BufferType.STORAGE);
        }

        for (let i = 0; i < lights.length; i++) {
            const lightViewMatrixInverse = lights[i].camera.viewMatrix.clone().invert();
            const lightDirection = new Vector3(0.0, 1.0, 0.0).applyMatrix4(lightViewMatrixInverse).mul(-1).normalize();
            const lightData = getLightViewProjections(Camera.mainCamera, lightDirection, numOfCascades, assignmentExponent, shadowDepthPercentage, zMult);

            const ld = new Float32Array(lightData.flatMap(v => v.elements).flatMap(v => [...v]));
            // const ld = new Float32Array(lightViewMatrixInverse.elements);
            // const ld = new Float32Array(lights[i].camera.projectionMatrix.clone().mul(lights[i].camera.viewMatrix.clone()).elements);
            this.lightProjectionViewMatricesBuffer.SetArray(ld, i * numOfCascades * 4 * 16);
            lightsCSMProjectionMatrix.push(ld);
        }

        const shadowOutput = resources.getResource(PassParams.ShadowPassDepth)
        shadowOutput.SetActiveLayer(0);

        this.drawIndirectShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
        
        // this.drawShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
        // this.drawInstancedShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);

        for (let i = 0; i < lights.length; i++) {
            RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, i * numOfCascades * 4 * 16, 0, numOfCascades * 4 * 16);

            for (let cascadePass = 0; cascadePass < numOfCascades; cascadePass++) {
                RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer);
    
                RendererContext.BeginRenderPass("ShadowPass", [], {target: shadowOutput, clear: cascadePass === 0 ? true : false});

                // TODO this should be parametric
                const width = shadowOutput.width / 2;
                const height = shadowOutput.height / 2;
                let x = 0;
                let y = 0;
                if (cascadePass >= 2) x += width;
                if (cascadePass % 2 !== 0) y += height;
                RendererContext.SetViewport(x, y, width, height, 0, 1);

                const inputIndirectVertices = resources.getResource(MeshletPassParams.indirectVertices) as Buffer;
                const inputIndirectObjectInfo = resources.getResource(MeshletPassParams.indirectObjectInfo) as Buffer;
                const inputIndirectMeshMatrixInfo = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo) as Buffer;
                const inputIndirectInstanceInfo = resources.getResource(MeshletPassParams.indirectInstanceInfo) as Buffer;
                const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.indirectDrawBuffer) as Buffer;
                
                this.drawIndirectShadowShader.SetBuffer("vertices", inputIndirectVertices);
                this.drawIndirectShadowShader.SetBuffer("objectInfo", inputIndirectObjectInfo);
                this.drawIndirectShadowShader.SetBuffer("meshMatrixInfo", inputIndirectMeshMatrixInfo);
                this.drawIndirectShadowShader.SetBuffer("instanceInfo", inputIndirectInstanceInfo);
                RendererContext.DrawIndirect(this.meshletGeometry, this.drawIndirectShadowShader, inputIndirectDrawBuffer); 
    
                RendererContext.EndRenderPass();
            }
            

            // RendererContext.BeginRenderPass("MeshletsShadowMapPass", [], {target: shadowOutput, clear: false}, true);
            
            // const inputIndirectVertices = resources.getResource(MeshletPassParams.indirectVertices) as Buffer;
            // const inputIndirectObjectInfo = resources.getResource(MeshletPassParams.indirectObjectInfo) as Buffer;
            // const inputIndirectMeshMatrixInfo = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo) as Buffer;
            // const inputIndirectInstanceInfo = resources.getResource(MeshletPassParams.indirectInstanceInfo) as Buffer;
            // const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.indirectDrawBuffer) as Buffer;
            
            // this.drawIndirectShadowShader.SetBuffer("vertices", inputIndirectVertices);
            // this.drawIndirectShadowShader.SetBuffer("objectInfo", inputIndirectObjectInfo);
            // this.drawIndirectShadowShader.SetBuffer("meshMatrixInfo", inputIndirectMeshMatrixInfo);
            // this.drawIndirectShadowShader.SetBuffer("instanceInfo", inputIndirectInstanceInfo);
            // RendererContext.DrawIndirect(this.meshletGeometry, this.drawIndirectShadowShader, inputIndirectDrawBuffer); 

            // RendererContext.EndRenderPass();

            shadowOutput.SetActiveLayer(shadowOutput.GetActiveLayer()+1);
        }
        shadowOutput.SetActiveLayer(0);

        // resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
    }
}