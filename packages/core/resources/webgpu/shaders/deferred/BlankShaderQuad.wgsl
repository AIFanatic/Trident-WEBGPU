// const geometry = Geometry.Plane();
// const shader = await GPU.Shader.Create({
//     code: `
//         @vertex
//         fn vertexMain(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
//             return vec4(position, 1.0);
//         }
        
//         @fragment
//         fn fragmentMain() -> @location(0) vec4<f32> {
//             return vec4(1.0, 0.0, 0.0, 1.0);
//         }
//     `,
//     colorOutputs: [{format: "rgba16float"}],
//     attributes: { position: { location: 0, size: 3, type: "vec3" } },
//     uniforms: {}
// });

@vertex
fn vertexMain(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
    return vec4(position, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4(1.0, 0.0, 0.0, 1.0);
}