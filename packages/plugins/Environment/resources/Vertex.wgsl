struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv: vec2<f32>,
};

// Full-screen triangle (covers screen with 3 verts)
const vertices = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
);

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    var output: VertexOutput;
    let vertex = vertices[vertexIndex];
    output.position = vec4(vertex, 0.0, 1.0);

    output.uv = vertex * 0.5 + 0.5;
    output.uv.y = 1.0 - output.uv.y;
    return output;
}