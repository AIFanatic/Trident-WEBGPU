import { GPU } from "@trident/core";
import { PrepareMeshletData } from "./PrepareMeshletData";
import { CullingPass } from "./CullingPass";
import { IndirectGBufferPass } from "./IndirectGBufferPass";

export enum MeshletPassParams {
    MeshletParams = "MeshletParams",
    // All vertices from all the meshlets, interleaved (px,py,pz,nx,ny,nz,ux,uy)
    VertexBuffer = "VertexBuffer",
    // All indices from all the meshlets
    MeshletTrianglesBuffer = "MeshletTrianglesBuffer",
    // meshlet.vertex_offset + vertexBufferOffset, meshlet.triangle_offset + indexBufferOffset, meshlet.triangle_count, meshlet.vertex_count
    MeshletBuffer = "MeshletBuffer",
    // modelMatrix   : mat4x4<f32>
    MeshBuffer = "MeshBuffer",
    // lod: u32, meshIndex: u32, baseVertexFloatOffset: u32, baseTriangleOffset: u32, materialIndex: u32
    LodMeshBuffer = "LodMeshBuffer",
    // MeshletMesh material
    MaterialInfoBuffer = "MaterialInfoBuffer",
    // All meshlets information (one per every meshlet), represents pointers into other buffers (like MeshletBuffer)
    ObjectInfoBuffer = "ObjectInfoBuffer",
    // Set by the CullingPass, visible ObjectInfo indices
    InstanceInfoBuffer = "InstanceInfoBuffer",
    // The draw indirect buffer, used in IndirectGBufferPass, made by a compute shader in CullingPass
    DrawIndirectBuffer = "DrawIndirectBuffer",
    // Current total meshlet count
    CurrentMeshletCount = "CurrentMeshletCount",
    // Meshlets to be drawn
    FrameMeshlets = "FrameMeshlets",
};

export class MeshletDraw extends GPU.RenderPass {
    public name: string = "MeshletDraw";
    
    private prepareMeshletData: PrepareMeshletData = new PrepareMeshletData();
    private cullingPass: CullingPass = new CullingPass();
    private indirectGBufferPass: IndirectGBufferPass = new IndirectGBufferPass();

    public async init(resources: GPU.ResourcePool) {
        await this.prepareMeshletData.init(resources);
        await this.cullingPass.init(resources);
        await this.indirectGBufferPass.init(resources);
    }

    public async preFrame(resources: GPU.ResourcePool) {
        await this.prepareMeshletData.preFrame(resources);
        await this.cullingPass.preFrame(resources);
        await this.indirectGBufferPass.preFrame(resources);
    }

    public async execute(resources: GPU.ResourcePool) {
        await this.prepareMeshletData.execute(resources);
        await this.cullingPass.execute(resources);
        await this.indirectGBufferPass.execute(resources);
    }
}
