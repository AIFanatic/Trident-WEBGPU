import { GPU, Components, GameObject, Geometry } from "@trident/core";
import { Ptr, VBuffer } from "../Heap";
import { BindlessPBRMaterial } from "../BindlessPBRMaterial";
import { BindlessDrawCommand } from "../passes/BindlessDrawPass";

export class BindlessMesh extends Components.Component {
    public runInEditMode: boolean = true;

    public readonly drawCommands: BindlessDrawCommand[] = [];

    public static readonly Instances = new Set<BindlessMesh>();
    private static readonly geometryCache = new Map<Geometry, { ptr: Ptr; indexCount: number }>();

    private _geometry?: Geometry;
    private _material?: BindlessPBRMaterial;

    protected transformData?: VBuffer;
    private drawRecord?: VBuffer;
    public indexCount = 0;
    public get ready(): boolean { return this.drawRecord !== undefined; }

    public set geometry(g: Geometry) { this._geometry = g; this.tryUpload(); }
    public set material(m: BindlessPBRMaterial) { this._material = m; this.tryUpload(); }

    public geometryPtr: Ptr = 0;
    public get transformPtr(): Ptr { return this.transformData!.ptr; }

    public instanceCount = 1;
    public get vertexCount(): number { return this.indexCount * this.instanceCount; }

    public enableShadows: boolean = true;

    // How many transforms to allocate. Subclasses override.
    protected transformCapacity(): number { return 1; }

    constructor(gameObject: GameObject) {
        super(gameObject);
        BindlessMesh.Instances.add(this);
    }

    private tryUpload() {
        if (!this._geometry || !this._material || this.drawRecord) return;

        const geo = BindlessMesh.uploadGeometry(this._geometry);
        this.geometryPtr = geo.ptr;
        this.indexCount = geo.indexCount;

        this.transformData = new VBuffer(16 * this.transformCapacity());

        // draw record: [geometryPtr, transformsPtr, materialPtr, pad] — view-free
        this.drawRecord = new VBuffer(4);
        this.drawRecord.SetArray(new Uint32Array([geo.ptr, this.transformData.ptr, this._material.ptr, 0]));

        this.drawCommands.push({
            cullMode: (this._material?.params.cullMode ?? "back") as BindlessDrawCommand["cullMode"],
            castShadows: this.enableShadows,
            vertexCount: this.vertexCount,
            drawPtr: this.drawRecord.ptr,
        });
    }

    public static uploadGeometry(geometry: Geometry) {
        let cached = BindlessMesh.geometryCache.get(geometry);
        if (cached) return cached;

        const vertices = geometry.attributes.get("position")!.array as Float32Array;
        const normals = geometry.attributes.get("normal")!.array as Float32Array;
        const uvs = geometry.attributes.get("uv")?.array as Float32Array | undefined;
        const indices = new Uint32Array(geometry.index!.array);

        const positions = new VBuffer(vertices.length);
        positions.SetArray(vertices);
        const normalData = new VBuffer(normals.length);
        normalData.SetArray(normals);

        let uvsPtr = 0;
        if (uvs) {
            const uvData = new VBuffer(uvs.length);
            uvData.SetArray(uvs);
            uvsPtr = uvData.ptr;
        }

        const indexData = new VBuffer(indices.length);
        indexData.SetArray(indices);

        const record = new VBuffer(5);
        record.SetArray(new Uint32Array([positions.ptr, normalData.ptr, uvsPtr, indexData.ptr, indices.length]));

        cached = { ptr: record.ptr, indexCount: indices.length };
        BindlessMesh.geometryCache.set(geometry, cached);
        return cached;
    }

    public OnPreFrame() {
        this.transformData!.SetArray(this.transform.localToWorldMatrix.elements);
        const cmd = this.drawCommands[0];
        if (cmd) { cmd.vertexCount = this.vertexCount; cmd.castShadows = this.enableShadows; }
    }

    public Destroy() {
        BindlessMesh.Instances.delete(this);   // heap space leaks for now — free-list later
        super.Destroy();
    }
}