// const geometry = Geometry.Plane();
// const shader = await GPU.Shader.Create({
//     code: `
//         @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
//         @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
//         @group(0) @binding(2) var<storage, read> modelMatrix: mat4x4<f32>;

//         @vertex
//         fn vertexMain(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
//             return projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
//         }
        
//         @fragment
//         fn fragmentMain() -> @location(0) vec4<f32> {
//             return vec4(1.0, 0.0, 0.0, 1.0);
//         }
//     `,
//     colorOutputs: [{format: "rgba16float"}],
//     depthOutput: "depth24plus",
//     attributes: { position: { location: 0, size: 3, type: "vec3" } },
//     uniforms: {
//         projectionMatrix: {group: 0, binding: 0, type: "storage"},
//         viewMatrix: {group: 0, binding: 1, type: "storage"},
//         modelMatrix: {group: 0, binding: 2, type: "storage"}
//     }
// })

@vertex
fn vertexMain(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
    return vec4(position, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4(1.0, 0.0, 0.0, 1.0);
}