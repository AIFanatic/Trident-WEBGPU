import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    VertexAttribute,
    IndexAttribute,
    Utils,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

interface BufferAllocation {
    byteOffset: number;
    byteSize: number;
    elemOffset: number;
};

class DynamicBufferMemoryAllocator {
    protected allocator: GPU.MemoryAllocator;
    protected buffer: GPU.Buffer;
    protected links: Map<any, number>;
    private incrementAmount: number;

    protected static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
    protected bufferType: GPU.BufferType;

    constructor(size: number, bufferType = GPU.BufferType.STORAGE, incrementAmount?: number) {
        this.allocator = new GPU.MemoryAllocator(size);
        this.buffer = GPU.Buffer.Create(size * DynamicBufferMemoryAllocator.BYTES_PER_ELEMENT, bufferType);
        this.links = new Map();
        this.bufferType = bufferType;
        this.incrementAmount = incrementAmount ? incrementAmount : size;
    }

    public set(link: any, data: Float32Array | Uint32Array, offset: number = 0): BufferAllocation {
        let bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) {
            if (this.allocator.availableMemorySize - data.length < 0) {
                // Increment allocator
                const o = this.allocator.memorySize;
                const incrementAmount = this.incrementAmount > data.length ? this.incrementAmount : data.length;
                const oldMemorySize = this.allocator.memorySize - this.allocator.availableMemorySize;
                this.allocator.memorySize += incrementAmount;
                this.allocator.availableMemorySize += incrementAmount;
                this.allocator.freeBlocks.push({ offset: oldMemorySize, size: incrementAmount });
                console.log(`Incrementing DynamicBuffer from ${o} to ${this.allocator.memorySize}`)

                // Create new buffer
                const buffer = GPU.Buffer.Create(this.allocator.memorySize * DynamicBufferMemoryAllocator.BYTES_PER_ELEMENT, this.bufferType);
                const hasActiveFrame = GPU.Renderer.HasActiveFrame();
                if (!hasActiveFrame) GPU.Renderer.BeginRenderFrame();
                GPU.RendererContext.CopyBufferToBuffer(this.buffer, buffer);
                if (!hasActiveFrame) GPU.Renderer.EndRenderFrame();

                const oldBuffer = this.buffer;
                GPU.Renderer.OnFrameCompleted().then(() => {
                    oldBuffer.Destroy();
                })

                this.buffer = buffer;
            }

            bufferOffset = this.allocator.allocate(data.length);
            this.links.set(link, bufferOffset);
        }
        const byteOffset = bufferOffset * DynamicBufferMemoryAllocator.BYTES_PER_ELEMENT;
        this.buffer.SetArray(data, byteOffset + offset, 0, data.length);
        return { byteOffset: byteOffset, byteSize: data.byteLength, elemOffset: bufferOffset };
        // return bufferOffset;
    }

    public delete(link: any) {
        const bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) throw Error("Link not found");
        this.allocator.free(bufferOffset);
        this.links.delete(link);
        // TODO: Resize buffer
    }

    public getBuffer(): GPU.Buffer { return this.buffer; }
    public getAllocator(): GPU.MemoryAllocator { return this.allocator; }
}

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const cubeGeometry = Geometry.Cube();
    const cubeVertices = cubeGeometry.attributes.get("position").array as Float32Array;
    const cubeIndices = cubeGeometry.index.array as Uint32Array;
    const sphereGeometry = Geometry.Sphere();
    const sphereVertices = sphereGeometry.attributes.get("position").array as Float32Array;
    const sphereIndices = sphereGeometry.index.array as Uint32Array;

    const size = 1000;
    const vertexBuffer = new DynamicBufferMemoryAllocator(size, GPU.BufferType.VERTEX);
    const indexBuffer = new DynamicBufferMemoryAllocator(size, GPU.BufferType.INDEX);

    const dataBuffer = new DynamicBufferMemoryAllocator(size, GPU.BufferType.STORAGE);
    const pointersBuffer = new DynamicBufferMemoryAllocator(size, GPU.BufferType.STORAGE);
    // const pointersBuffer = GPU.Buffer.Create(size, GPU.BufferType.STORAGE);

    let objectCount = 0;
    class Object {
        public readonly id = Utils.UUID();

        public readonly vertexBufferAllocator: BufferAllocation;
        public readonly indexBufferAllocator: BufferAllocation;
        public readonly dataAllocator: BufferAllocation;
        public readonly pointerAllocator: BufferAllocation;
        public readonly maxInstanceCount: number;
        public readonly dataSize: number;
        public currentInstanceCount: number;

        constructor(vertices: Float32Array, indices: Uint32Array, dataSize: number, maxInstanceCount: number = 1) {
            const verticesCRC = Utils.CRC32.forBytes(new Uint8Array(vertices.buffer));
            const indicesCRC = Utils.CRC32.forBytes(new Uint8Array(indices.buffer));

            this.vertexBufferAllocator = vertexBuffer.set(verticesCRC, vertices);
            this.indexBufferAllocator = indexBuffer.set(indicesCRC, indices);
            this.dataAllocator = dataBuffer.set(this.id, new Float32Array(dataSize * maxInstanceCount));
            this.maxInstanceCount = maxInstanceCount;
            this.currentInstanceCount = 0;
            this.dataSize = dataSize;

            for (let i = 0; i < maxInstanceCount; i++) {
                this.pointerAllocator = pointersBuffer.set(`${this.id}-${i}`, new Uint32Array([objectCount]));
                objectCount++;
            }
        }

        public setData(data: Float32Array, offset: number = 0) {
            dataBuffer.set(this.id, data, offset * 4);
        }

        public setInstanceData(data: Float32Array, instanceIndex: number) {
            this.setData(data, this.dataSize * instanceIndex);
            this.currentInstanceCount = Math.max(instanceIndex, this.currentInstanceCount);
        }
    }

    let objects: Object[] = [];

    const c = 10000;

    // Instances
    const cubes = new Object(cubeVertices, cubeIndices, 16, c);
    // const spheres = new Object(sphereVertices, sphereIndices, 16, c);
    objects.push(cubes);
    // objects.push(spheres);
    let modelMatrix = new Mathf.Matrix4();
    let position = new Mathf.Vector3();
    let rotation = new Mathf.Quaternion();
    let scale = new Mathf.Vector3(1,1,1);
    for (let i = 0; i < c; i++) {
        const off = 1000;
        const r = (off) => (Math.random() * off) - off * 0.5;
        position.set(r(off), r(off), r(off));
        scale.set(Math.random(), Math.random(), Math.random())
        modelMatrix.compose(position, rotation, scale);
        cubes.setInstanceData(modelMatrix.elements, i);
        // cubes.setInstanceData(position.elements, i);
    }

    console.log(objects);

    // TODO: Dodgy
    const globalVerticesAttribute = new VertexAttribute(new Float32Array([0]));
    const globalIndicesAttribute = new IndexAttribute(new Uint32Array([0]));
    globalVerticesAttribute.buffer = vertexBuffer.getBuffer();
    globalIndicesAttribute.buffer = indexBuffer.getBuffer();

    const globalGeometry = new Geometry();
    globalGeometry.attributes.set("position", globalVerticesAttribute);
    globalGeometry.index = globalIndicesAttribute;

    class BindlessDrawPass extends GPU.RenderPass {
        private shader: GPU.Shader;

        public name: string = "BindlessDrawPass";

        constructor() {
            super({});
        }

        public async init(resources: GPU.ResourcePool) {

            this.shader = await GPU.Shader.Create({
                code: `
                struct VertexInput {
                    @builtin(instance_index) instanceIdx : u32, 
                    @location(0) position : vec3<f32>,
                };
                
                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) color : vec3<f32>
                };

                struct InstanceData {
                    modelMatrix: mat4x4<f32>
                    // position: vec4<f32>
                };
                // @group(0) @binding(0) var<storage, read> data: array<u32>;
                @group(0) @binding(0) var<storage, read> data: array<InstanceData>;
                @group(0) @binding(1) var<storage, read> pointers : array<u32>;

                @group(1) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                @group(1) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
                
                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;

                    // let baseAddress = pointers[input.instanceIdx];
                    let baseAddress = pointers[input.instanceIdx];
                
                    // let position = data[baseAddress].position;
                    // output.position = projectionMatrix * viewMatrix * vec4(input.position + position.xyz, 1.0);
                    let modelMatrix = data[baseAddress].modelMatrix;
                    output.position = projectionMatrix * viewMatrix * modelMatrix * vec4(input.position, 1.0);
                    
                    // output.color = color;

                    return output;
                }
                
                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    return vec4f(input.color + 0.5, 1.0);
                }
                `,
                colorOutputs: [
                    { format: GPU.Renderer.SwapChainFormat },
                ],
                attributes: {
                    position: { location: 0, size: 3, type: "vec3" },
                },
                uniforms: {
                    data: { group: 0, binding: 0, type: "storage" },
                    pointers: { group: 0, binding: 1, type: "storage" },
                    projectionMatrix: { group: 1, binding: 0, type: "storage" },
                    viewMatrix: { group: 1, binding: 1, type: "storage" },
                }
            })

            this.shader.SetBuffer("data", dataBuffer.getBuffer());
            this.shader.SetBuffer("pointers", pointersBuffer.getBuffer());
            this.initialized = true;
        }

        public execute(resources: GPU.ResourcePool) {
            if (!this.initialized) return;

            const camera = Components.Camera.mainCamera;

            this.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
            this.shader.SetMatrix4("viewMatrix", camera.viewMatrix);

            const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
            GPU.RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: true }], undefined, true);

            let i = 0;
            for (const object of objects) {
                if (object.currentInstanceCount === 0) continue;
                globalVerticesAttribute.currentOffset = object.vertexBufferAllocator.byteOffset;
                globalVerticesAttribute.currentSize = object.vertexBufferAllocator.byteSize;
                globalIndicesAttribute.currentOffset = object.indexBufferAllocator.byteOffset;
                globalIndicesAttribute.currentSize = object.indexBufferAllocator.byteSize;

                GPU.RendererContext.DrawIndexed(globalGeometry, this.shader, object.indexBufferAllocator.byteSize / 4, object.currentInstanceCount, 0, 0, i);
                i += object.currentInstanceCount;
            }
            GPU.RendererContext.EndRenderPass();
        }
    }

    const bindlessDrawPass = new BindlessDrawPass();
    scene.renderPipeline.AddPass(bindlessDrawPass, GPU.RenderPassOrder.AfterLighting);
    Debugger.Enable();

    scene.Start();

};

Application(document.querySelector("canvas"));