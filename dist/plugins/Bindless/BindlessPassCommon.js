const BINDLESS_WGSL = `
    @group(0) @binding(0) var<storage, read> data: array<u32>;

    fn loadU32(p: u32) -> u32    { return data[p]; }
    fn loadF32(p: u32) -> f32    { return bitcast<f32>(data[p]); }
    fn loadVec3(p: u32) -> vec3f { return vec3f(loadF32(p), loadF32(p + 1u), loadF32(p + 2u)); }
    fn loadVec4(p: u32) -> vec4f { return vec4f(loadF32(p), loadF32(p + 1u), loadF32(p + 2u), loadF32(p + 3u)); }
    fn loadMat4(p: u32) -> mat4x4f { return mat4x4f(loadVec4(p), loadVec4(p + 4u), loadVec4(p + 8u), loadVec4(p + 12u)); }

    fn U32At(base: u32, i: u32) -> u32      { return data[base + i]; }
    fn Vec3At(base: u32, i: u32) -> vec3f   { return loadVec3(base + i * 3u); }
    fn Mat4At(base: u32, i: u32) -> mat4x4f { return loadMat4(base + i * 16u); }

    struct Draw     { geometry: u32, transforms: u32, camera: u32, material: u32 };
    struct Geometry { positions: u32, normals: u32, indices: u32, indexCount: u32 };
    struct Camera   { projection: mat4x4f, view: mat4x4f };
    struct Material { albedo: vec4f, emissive: vec4f, roughness: f32, metalness: f32, unlit: f32, alphaCutoff: f32 };

    fn loadDraw(p: u32) -> Draw         { return Draw(loadU32(p), loadU32(p + 1u), loadU32(p + 2u), loadU32(p + 3u)); }
    fn loadGeometry(p: u32) -> Geometry { return Geometry(loadU32(p), loadU32(p + 1u), loadU32(p + 2u), loadU32(p + 3u)); }
    fn loadCamera(p: u32) -> Camera     { return Camera(loadMat4(p), loadMat4(p + 16u)); }
    fn loadMaterial(p: u32) -> Material { return Material(loadVec4(p), loadVec4(p + 4u), loadF32(p + 8u), loadF32(p + 9u), loadF32(p + 10u), loadF32(p + 11u)); }
`;

export { BINDLESS_WGSL };
