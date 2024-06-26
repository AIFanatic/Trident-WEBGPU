import { Camera } from "../../components/Camera";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, DepthTextureArray } from "../Texture";
import { RendererContext } from "../RendererContext";
import { AreaLight, DirectionalLight, Light, PointLight, SpotLight } from "../../components/Light";
import { Mesh } from "../../components/Mesh";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Shader, ShaderCode, ShaderParams } from "../Shader";
import { Buffer, BufferType, DynamicBuffer } from "../Buffer";
import { EventSystem } from "../../Events";
import { Debugger } from "../../plugins/Debugger";
import { Vector3 } from "../../math/Vector3";
import { Vector4 } from "../../math/Vector4";
import { Matrix4 } from "../../math/Matrix4";

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

export class ShadowPass extends RenderPass {
    public name: string = "ShadowPass";
    
    private shadowDepthDT: DepthTexture;
    private shadowWidth = 1024;
    private shadowHeight = 1024;

    private shader: Shader;
    private instancedShader: Shader;

    private lightProjectionViewMatricesBuffer: Buffer;
    private modelMatrices: DynamicBuffer;

    private lightProjectionMatrixBuffer: Buffer;

    private needsUpdate: boolean = true;

    constructor(outputDepthDT: string) {
        super({outputs: [outputDepthDT]});

        this.shader = Shader.Create({
            code: ShaderCode.ShadowShader,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                cascadeIndex: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 1, binding: 0, type: "storage"},
            },
            depthOutput: "depth24plus",
            colorOutputs: []
        });
        
        this.instancedShader = Shader.Create({
            code: ShaderCode.ShadowShader,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                cascadeIndex: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 1, binding: 0, type: "storage"},
            },
            depthOutput: "depth24plus",
            colorOutputs: []
        });

        this.shadowDepthDT = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, 1);

        EventSystem.on("LightUpdated", component => {
            this.needsUpdate = true;
        })

        EventSystem.on("MeshUpdated", component => {
            this.needsUpdate = true;
        })

        EventSystem.on("MainCameraUpdated", component => {
            this.needsUpdate = true;
        })
    }

    private cascadeIndexBuffers: Buffer[] = [];
    private cascadeCurrentIndexBuffer: Buffer;

    public execute(resources: ResourcePool, outputDepthDT: string) {
        if (!this.needsUpdate) return;

        Debugger.AddFrameRenderPass("ShadowPass");

        const scene = Camera.mainCamera.gameObject.scene;

        // const lights = scene.GetComponents(Light);
        // TODO: Fix, GetComponents(Light)
        const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
        if (lights.length === 0) {
            resources.setResource(outputDepthDT, this.shadowDepthDT);
            return;
        }

        if (lights.length !== this.shadowDepthDT.depth) {
            this.shadowDepthDT = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, lights.length);
        }

        const meshes = scene.GetComponents(Mesh);
        const instancedMeshes = scene.GetComponents(InstancedMesh);

        // Lights

        // if (!this.lightProjectionMatricesBuffer || this.lightProjectionMatricesBuffer.size / 4 / 16 !== lights.length) {
        //     this.lightProjectionMatricesBuffer = Buffer.Create(lights.length * 4 * 16, BufferType.STORAGE);
        // }

        if (!this.lightProjectionMatrixBuffer) {
            this.lightProjectionMatrixBuffer = Buffer.Create(lights.length * 4 * 4 * 16, BufferType.STORAGE);
            this.shader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
            this.instancedShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
        }

        // Model
        if (!this.modelMatrices || this.modelMatrices.size / 256 !== meshes.length) {
            this.modelMatrices = DynamicBuffer.Create(meshes.length * 256, BufferType.STORAGE, 256);
        }

        // const tempLightDirection = new Vector3(0.5, -0.2, -1).normalize();
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
        for (let i = 0; i < lights.length; i++) {
            const lightViewMatrixInverse = lights[i].camera.viewMatrix.clone().invert();
            const lightDirection = new Vector3(0.0, 1.0, 0.0).applyMatrix4(lightViewMatrixInverse).mul(-1).normalize();
            const lightData = getLightViewProjections(Camera.mainCamera, lightDirection, numOfCascades, assignmentExponent, shadowDepthPercentage, zMult);

            const ld = new Float32Array(lightData.flatMap(v => v.elements).flatMap(v => [...v]));
            this.lightProjectionViewMatricesBuffer.SetArray(ld, i * numOfCascades * 4 * 16);
            lightsCSMProjectionMatrix.push(ld);
        }

        // TODO: Only update if model changes
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            if (!mesh.enableShadows) continue;
            this.modelMatrices.SetArray(mesh.transform.localToWorldMatrix.elements, i * 256)
        }

        this.shader.SetBuffer("modelMatrix", this.modelMatrices);

        

        this.shadowDepthDT.SetActiveLayer(0);
        
        this.shader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
        this.instancedShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);

        for (let i = 0; i < lights.length; i++) {
            RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, i * 4 * 4 * 16, 0, 4 * 4 * 16);

            
            const numOfCascades = 4;
            for (let cascadePass = 0; cascadePass < numOfCascades; cascadePass++) {
                RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer);

                RendererContext.BeginRenderPass("ShadowPass", [], {target: this.shadowDepthDT, clear: cascadePass === 0 ? true : false});

                // TODO this should be parametric
                const width = this.shadowWidth / 2;
                const height = this.shadowHeight / 2;
                let x = 0;
                let y = 0;
                if (cascadePass >= 2) x += width;
                if (cascadePass % 2 !== 0) y += height;
                RendererContext.SetViewport(x, y, width, height, 0, 1);
                
                for (let i = 0; i < meshes.length; i++) {
                    const mesh = meshes[i];
                    if (!mesh.enableShadows) continue;
                    const uniform_offset = i * 256;
                    this.modelMatrices.dynamicOffset = uniform_offset;
                    RendererContext.DrawGeometry(mesh.GetGeometry(), this.shader, 1);
                }

                for (let instancedMesh of instancedMeshes) {
                    if (instancedMesh.instanceCount === 0) continue;
                    this.instancedShader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
                    RendererContext.DrawGeometry(instancedMesh.GetGeometry(), this.instancedShader, instancedMesh.instanceCount);
                }

                RendererContext.EndRenderPass();
            }

            this.shadowDepthDT.SetActiveLayer(this.shadowDepthDT.GetActiveLayer()+1);
        }
        
        resources.setResource(outputDepthDT, this.shadowDepthDT);

        this.needsUpdate = false;
    }
}