struct VertexInput {
    @builtin(instance_index) instanceID : u32,
	@builtin(vertex_index) vertexID : u32,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
};

@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
@group(0) @binding(3) var<storage, read> indices: array<u32>;
@group(0) @binding(4) var<storage, read> positions: array<f32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
	var localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);

	var triangleIndex = input.vertexID / 6u;
	var localVertexIndex = input.vertexID % 6u;

	var elementIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];
	var elementIndex = indices[elementIndexIndex];

	var position = vec4<f32>(
		positions[3u * elementIndex + 0u],
		positions[3u * elementIndex + 1u],
		positions[3u * elementIndex + 2u],
		1.0
	);

	var output : VertexOutput;
    var modelMatrixInstance = modelMatrix[input.instanceID];
    var modelViewMatrix = viewMatrix * modelMatrixInstance;
	output.position = projectionMatrix * modelViewMatrix * position;

	return output;
}

@fragment
fn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {
    return vec4(1.0, 0.0, 0.0, 1.0);
}