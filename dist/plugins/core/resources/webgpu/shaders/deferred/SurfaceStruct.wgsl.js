var WGSL_Shader_Deferred_SurfaceStruct = "struct Surface {\n    albedo: vec3<f32>,\n    emissive: vec3<f32>,\n    metallic: f32,\n    roughness: f32,\n    occlusion: f32,\n    worldPosition: vec3<f32>,\n    N: vec3<f32>,\n    F0: vec3<f32>,\n    V: vec3<f32>,\n    depth: f32\n};";

export { WGSL_Shader_Deferred_SurfaceStruct as default };
