import { Renderer } from "../renderer/Renderer";

import { Vector3 } from "../math/Vector3";
import { Geometry, InterleavedVertexAttribute } from "../Geometry";
import { Compute } from "../renderer/Shader";
import { ComputeContext } from "../renderer/ComputeContext";
import { Buffer, BufferType } from "../renderer/Buffer";
import { RenderTextureStorage3D, Texture } from "../renderer/Texture";

export class SDFGenerator {
    public static async Generate(geometry: Geometry, scale = new Vector3(1,1,1)): Promise<Texture> {
        const compute = await Compute.Create({
            code: `
            @group(0) @binding(0) var i_SDF: texture_storage_3d<r32float, read_write>;
            
            struct Vertex
            {
                position: vec3<f32>,
                normal: vec3<f32>,
                tex_coord: vec2<f32>
            };
    
            @group(0) @binding(1) var<storage, read> vertices: array<Vertex>;
            @group(0) @binding(2) var<storage, read> indices: array<u32>;
            @group(0) @binding(3) var<storage, read> u_GridStepSize: vec3<f32>;
            @group(0) @binding(4) var<storage, read> u_GridOrigin: vec3<f32>;
            @group(0) @binding(5) var<storage, read> u_NumTriangles: u32;
            @group(0) @binding(6) var<storage, read> u_VolumeSize: vec3<i32>;
    
            const INFINITY: f32 = 100000000.0;
    
            fn dot2_v2(v: vec2f) -> f32 { return dot(v, v); }
            fn dot2_v3(v: vec3f) -> f32 { return dot(v, v); }
            fn ndot(a: vec2f, b: vec2f) -> f32 { return a.x * b.x - a.y * b.y; }
    
            fn sdf_triangle(p: vec3f, a: vec3f, b: vec3f, c: vec3f) -> f32
            {
                var ba  = b - a;
                var pa  = p - a;
                var cb  = c - b;
                var pb  = p - b;
                var ac  = a - c;
                var pc  = p - c;
                var nor = cross(ba, ac);
            
                var cond = (sign(dot(cross(ba, nor), pa)) + sign(dot(cross(cb, nor), pb)) + sign(dot(cross(ac, nor), pc)) < 2.0);
    
                if (cond) {
                    return min(min(
                                dot2_v3(ba * clamp(dot(ba, pa) / dot2_v3(ba), 0.0, 1.0) - pa),
                                dot2_v3(cb * clamp(dot(cb, pb) / dot2_v3(cb), 0.0, 1.0) - pb)),
                            dot2_v3(ac * clamp(dot(ac, pc) / dot2_v3(ac), 0.0, 1.0) - pc));
                }
                else {
                    return dot(nor, pa) * dot(nor, pa) / dot2_v3(nor);
                }
            }
            
            fn is_front_facing(p: vec3f, v0: Vertex, v1: Vertex, v2: Vertex) -> bool
            {
                return dot(normalize(p - v0.position.xyz), v0.normal.xyz) >= 0.0f || dot(normalize(p - v1.position.xyz), v1.normal.xyz) >= 0.0f || dot(normalize(p - v2.position.xyz), v2.normal.xyz) >= 0.0f;
            }
            
            @compute @workgroup_size(8, 8, 1)
            fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                var coord = vec3i(grid.xyz);
    
                // if (all(lessThan(coord, u_VolumeSize)))
                if (coord.x < u_VolumeSize.x && coord.y < u_VolumeSize.y && coord.z < u_VolumeSize.z)
                {
                    var p = u_GridOrigin + u_GridStepSize * vec3f(coord);
            
                    var closest_dist = INFINITY;
                    var front_facing = true;
            
                    for (var i: u32 = 0; i < u_NumTriangles; i++)
                    {
                        var v0: Vertex = vertices[indices[3 * i]];
                        var v1: Vertex = vertices[indices[3 * i + 1]];
                        var v2: Vertex = vertices[indices[3 * i + 2]];
            
                        var h = sdf_triangle(p, v0.position.xyz, v1.position.xyz, v2.position.xyz);
            
                        if (h < closest_dist)
                        {
                            closest_dist = h;
                            front_facing = is_front_facing(p, v0, v1, v2);
                        }
                    }
            
                    if (front_facing) { textureStore(i_SDF, coord, vec4(closest_dist)); }
                    else { textureStore(i_SDF, coord, vec4(-closest_dist)); }
                }
            } 
            `,
            computeEntrypoint: "main",
            uniforms: {
                i_SDF: {group: 0, binding: 0, type: "texture"},
                vertices: {group: 0, binding: 1, type: "storage"},
                indices: {group: 0, binding: 2, type: "storage"},
                
                u_GridStepSize: {group: 0, binding: 3, type: "storage"},
                u_GridOrigin: {group: 0, binding: 4, type: "storage"},
                u_NumTriangles: {group: 0, binding: 5, type: "storage"},
                u_VolumeSize: {group: 0, binding: 6, type: "storage"},
            }
        });
    
        const vertices = geometry.attributes.get("position")?.array as Float32Array;
        const normals = geometry.attributes.get("normal")?.array as Float32Array;
        const uvs = geometry.attributes.get("uv")?.array as Float32Array;
        const indices = geometry.index?.array as Uint32Array;
    
        if (!vertices) throw Error("Vertices not found");
        if (!normals) throw Error("Normals not found");
        if (!uvs) throw Error("UVS not found");
        if (!indices) throw Error("Indices not found");
    
        const padding = 8;
        const resolution = 0.025;
        const u_GridStepSize = new Vector3(resolution, resolution, resolution);
        const min_extents = geometry.boundingVolume.min.clone().mul(scale).sub(u_GridStepSize.clone().mul(padding));
        const max_extents = geometry.boundingVolume.max.clone().mul(scale).add(u_GridStepSize.clone().mul(padding));
    
        const u_GridOrigin = min_extents.clone().add(u_GridStepSize.clone().div(2));
        const box_size = max_extents.clone().sub(min_extents);
        const t = box_size.clone().div(u_GridStepSize);
        const u_VolumeSize = new Vector3(Math.ceil(t.x), Math.ceil(t.y), Math.ceil(t.z));
        const u_NumTriangles = indices.length / 3;
    
        const i_SDF_Texture = RenderTextureStorage3D.Create(u_VolumeSize.x, u_VolumeSize.y, u_VolumeSize.z, "r32float");
        compute.SetTexture("i_SDF", i_SDF_Texture);
    
        let verticesScaled = vertices.slice();
        for (let i = 0; i < verticesScaled.length; i+=3) {
            verticesScaled[i + 0] *= scale.x;
            verticesScaled[i + 1] *= scale.y;
            verticesScaled[i + 2] *= scale.z;
        }
        const interleaved = InterleavedVertexAttribute.fromArrays([verticesScaled, normals, uvs], [3,3,2], [4,4,4]);
        const vertexBuffer = Buffer.Create(interleaved.array.length * 4, BufferType.STORAGE);
        vertexBuffer.SetArray(new Float32Array(interleaved.array));
        compute.SetBuffer("vertices", vertexBuffer);
        
        const indexBuffer = Buffer.Create(indices.length * 4, BufferType.STORAGE);
        indexBuffer.SetArray(indices);
        compute.SetBuffer("indices", indexBuffer);
    
        Renderer.BeginRenderFrame();
        ComputeContext.BeginComputePass("SDF Gen");
    
        compute.SetArray("u_GridStepSize", new Float32Array([...u_GridStepSize.elements, 0]));
        compute.SetArray("u_GridOrigin", new Float32Array([...u_GridOrigin.elements, 0]));
        compute.SetArray("u_NumTriangles", new Uint32Array([u_NumTriangles]));
        compute.SetArray("u_VolumeSize", new Uint32Array([...u_VolumeSize.elements, 0]));
    
        const NUM_THREADS_X = 8;
        const NUM_THREADS_Y = 8;
        const NUM_THREADS_Z = 1;
    
        const size_x = Math.ceil(u_VolumeSize.x / NUM_THREADS_X);
        const size_y = Math.ceil(u_VolumeSize.y / NUM_THREADS_Y);
        const size_z = Math.ceil(u_VolumeSize.z / NUM_THREADS_Z);
    
        console.log("dispatch", size_x, size_y, size_z)
        ComputeContext.Dispatch(compute, size_x, size_y, size_z);
        ComputeContext.EndComputePass();
        
        Renderer.EndRenderFrame();
    
        return i_SDF_Texture;
    }
}