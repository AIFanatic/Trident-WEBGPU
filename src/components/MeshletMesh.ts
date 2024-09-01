import { Component } from "./Component";
import { Material } from "../renderer/Material";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Geometry, InterleavedVertexAttribute } from "../Geometry";
import { Meshletizer } from "../plugins/meshlets/Meshletizer";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { EventSystem, EventSystemLocal } from "../Events";

const meshletsCache: Map<Geometry, {meshlets: Meshlet[], instanceCount: number}> = new Map();

export class MeshletMesh extends Component {
    private geometry: Geometry;
    private materialsMapped: Map<string, Material[]> = new Map();

    public enableShadows: boolean = true;

    public meshlets: Meshlet[] = [];

    public Start(): void {
        EventSystemLocal.on("TransformUpdated", transform => {
            EventSystem.emit("MeshletUpdated", this);
        }, this.gameObject.id)    
    }

    public AddMaterial(material: Material) {
        if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
        this.materialsMapped.get(material.constructor.name)?.push(material);
    }

    public GetMaterials<T extends Material>(type: new(...args: any[]) => T): T[] {
        return this.materialsMapped.get(type.name) as T[] || [];
    }

    public async SetGeometry(geometry: Geometry) {
        this.geometry = geometry;
        let cached = meshletsCache.get(geometry);
        if (cached) {
            cached.instanceCount++;
            meshletsCache.set(geometry, cached);
            this.meshlets.push(...cached.meshlets);
            return;
        }

        const pa = geometry.attributes.get("position");
        const na = geometry.attributes.get("normal");
        const ua = geometry.attributes.get("uv");
        const ia = geometry.index;
        if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
        
        const p = pa.array as Float32Array;
        const n = na.array as Float32Array;
        const u = ua.array as Float32Array;
        const indices = ia.array as Uint32Array;

        const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
        const interleavedVertices = interleavedBufferAttribute.array as Float32Array;

        await Meshoptimizer.load();
        const allMeshlets = await Meshletizer.Build(interleavedVertices, indices);

        this.meshlets = allMeshlets;
        meshletsCache.set(geometry, {meshlets: this.meshlets, instanceCount: 0});
    }

    public Destroy() {
        EventSystem.emit("MeshletDeleted", this);
        const cached = meshletsCache.get(this.geometry);
        if (!cached) throw Error("Geometry should be in meshletsCache");

        cached.instanceCount--;
        meshletsCache.set(this.geometry, cached);
        if (cached.instanceCount <= 0) {
            meshletsCache.delete(this.geometry);
        }

        EventSystem.emit("RemovedComponent", this, this.gameObject.scene);
    }
}