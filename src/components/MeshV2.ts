import { Component } from "./Component";
import { Material } from "../renderer/Material";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Geometry, InterleavedVertexAttribute } from "../Geometry";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { EventSystem, EventSystemLocal } from "../Events";
import { MeshletCreator } from "../plugins/meshlets/utils/MeshletCreator";

export const meshletsCache: Map<Geometry, {meshlets: Meshlet[], instanceCount: number}> = new Map();

export class Mesh extends Component {
    protected geometry: Geometry;
    protected materialsMapped: Map<string, Material[]> = new Map();

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
        const allMeshlets = MeshletCreator.build(interleavedVertices, indices, 255, Meshlet.max_triangles);

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