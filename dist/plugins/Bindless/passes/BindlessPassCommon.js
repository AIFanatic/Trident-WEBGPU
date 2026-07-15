const BINDLESS_TYPES = `
    fn loadF32(p: u32) -> f32    { return bitcast<f32>(loadU32(p)); }
    fn loadVec2(p: u32) -> vec2f { return vec2f(loadF32(p), loadF32(p + 1u)); }
    fn loadVec3(p: u32) -> vec3f { return vec3f(loadF32(p), loadF32(p + 1u), loadF32(p + 2u)); }
    fn loadVec4(p: u32) -> vec4f { return vec4f(loadF32(p), loadF32(p + 1u), loadF32(p + 2u), loadF32(p + 3u)); }
    fn loadMat4(p: u32) -> mat4x4f { return mat4x4f(loadVec4(p), loadVec4(p + 4u), loadVec4(p + 8u), loadVec4(p + 12u)); }

    fn U32At(base: u32, i: u32) -> u32      { return loadU32(base + i); }
    fn F32At(base: u32, i: u32) -> f32      { return loadF32(base + i); }
    fn Vec2At(base: u32, i: u32) -> vec2f   { return loadVec2(base + i * 2u); }
    fn Vec3At(base: u32, i: u32) -> vec3f   { return loadVec3(base + i * 3u); }
    fn Mat4At(base: u32, i: u32) -> mat4x4f { return loadMat4(base + i * 16u); }

    struct Draw     { geometry: u32, transforms: u32, material: u32 };
    struct Geometry { positions: u32, normals: u32, uvs: u32, indices: u32, indexCount: u32 };
    struct Camera   { projection: mat4x4f, view: mat4x4f };
    struct Material { albedo: vec4f, emissive: vec4f, roughness: f32, metalness: f32, unlit: f32, alphaCutoff: f32, albedoRegion: vec4f, normalRegion: vec4f, armRegion: vec4f };

    fn loadDraw(p: u32) -> Draw         { return Draw(loadU32(p), loadU32(p + 1u), loadU32(p + 2u)); }
    fn loadGeometry(p: u32) -> Geometry { return Geometry(loadU32(p), loadU32(p + 1u), loadU32(p + 2u), loadU32(p + 3u), loadU32(p + 4u)); }
    fn loadCamera(p: u32) -> Camera     { return Camera(loadMat4(p), loadMat4(p + 16u)); }
    fn loadMaterial(p: u32) -> Material { return Material(loadVec4(p), loadVec4(p + 4u), loadF32(p + 8u), loadF32(p + 9u), loadF32(p + 10u), loadF32(p + 11u), loadVec4(p + 12u), loadVec4(p + 16u), loadVec4(p + 20u)); }
`;
const BINDLESS_WGSL = `
    @group(0) @binding(0) var<storage, read> data: array<u32>;
    @group(0) @binding(1) var<storage, read> passPtr: u32;   // this passPtr's record ptr
    fn loadU32(p: u32) -> u32 { return data[p]; }
` + BINDLESS_TYPES + `
    fn currentCamera() -> Camera { return loadCamera(passPtr); }
`;
const BINDLESS_COMPUTE_WGSL = `
    @group(0) @binding(0) var<storage, read_write> data: array<atomic<u32>>;
    @group(0) @binding(1) var<storage, read> passPtr: u32;   // this dispatch's record ptr
    fn loadU32(p: u32) -> u32           { return atomicLoad(&data[p]); }
    fn storeU32(p: u32, v: u32)         { atomicStore(&data[p], v); }
    fn storeF32(p: u32, v: f32)         { atomicStore(&data[p], bitcast<u32>(v)); }
    fn atomicAddU32(p: u32, v: u32) -> u32 { return atomicAdd(&data[p], v); }
    fn storeMat4(p: u32, m: mat4x4f) {
        for (var c = 0u; c < 4u; c++) {
            let col = m[c];
            storeF32(p + c * 4u + 0u, col.x); storeF32(p + c * 4u + 1u, col.y);
            storeF32(p + c * 4u + 2u, col.z); storeF32(p + c * 4u + 3u, col.w);
        }
    }
` + BINDLESS_TYPES;

export { BINDLESS_COMPUTE_WGSL, BINDLESS_WGSL };
