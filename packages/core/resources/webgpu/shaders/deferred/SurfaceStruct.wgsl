struct Surface {
    albedo: vec3<f32>,
    emissive: vec3<f32>,
    metallic: f32,
    roughness: f32,
    occlusion: f32,
    worldPosition: vec3<f32>,
    N: vec3<f32>,
    F0: vec3<f32>,
    V: vec3<f32>,
    depth: f32
};