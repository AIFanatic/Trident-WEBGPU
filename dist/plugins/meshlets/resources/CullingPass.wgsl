#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
#include "./Structs.wgsl"

@group(0) @binding(0) var<storage, read_write> drawBuffer: array<DrawBuffer>;
@group(0) @binding(1) var<storage, read_write> instanceInfoBuffer: array<InstanceInfo>;
@group(0) @binding(2) var<storage, read> frameBuffer: FrameBuffer;
@group(0) @binding(3) var<storage, read> meshletInfoBuffer: array<MeshletInfo>;
@group(0) @binding(4) var<storage, read> meshInfoBuffer: array<MeshInfo>;
@group(0) @binding(5) var<storage, read> lodMeshBuffer: array<LodMeshInfo>;
@group(0) @binding(6) var<storage, read> objectInfoBuffer: array<ObjectInfo>;
@group(0) @binding(7) var<storage, read> meshletParamsBuffer: MeshletParams;

fn computeRadiusScale(modelMatrix: mat4x4<f32>) -> f32 {
    let sx = length(modelMatrix[0].xyz);
    let sy = length(modelMatrix[1].xyz);
    let sz = length(modelMatrix[2].xyz);
    return max(sx, max(sy, sz));
}

fn worldCenter(modelMatrix: mat4x4<f32>, localCenter: vec3f) -> vec3f {
    return (modelMatrix * vec4f(localCenter, 1.0)).xyz;
}

fn worldDirection(modelMatrix: mat4x4<f32>, localDir: vec3f) -> vec3f {
    // upper-left 3x3 is enough (uniform + non-uniform scale, orthogonal camera)
    let m = mat3x3<f32>(
        modelMatrix[0].xyz,
        modelMatrix[1].xyz,
        modelMatrix[2].xyz
    );
    return normalize(m * localDir);
}

fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
    return dot(normal, point) + constant;
}

fn boundsError(bounds: vec4f, bounds_error: f32, camera_position: vec3f, camera_proj: f32, camera_znear: f32) -> f32 {
	let dx = bounds.x - camera_position.x;
    let dy = bounds.y - camera_position.y;
    let dz = bounds.z - camera_position.z;
	let d = sqrt(dx * dx + dy * dy + dz * dz) - bounds.w;
    var dCond = camera_znear;
    if (d > camera_znear) { dCond = d; }
	return bounds_error / dCond * (camera_proj * 0.5);
}

fn IsFrustumCulled(meshlet: MeshletInfo, modelMatrix: mat4x4<f32>) -> bool {
    let radiusScale = computeRadiusScale(modelMatrix);
    let centerWorld = worldCenter(modelMatrix, meshlet.bounding_sphere.xyz);
    // let centerView = viewCenter(centerWorld);
    let worldRadius = meshlet.bounding_sphere.w * radiusScale;

    if (distance(frameBuffer.viewPosition.xyz, centerWorld) > 1000.0) {
        return true;
    }

    if (bool(meshletParamsBuffer.isDynamicLODEnabled)) {
        // if (!isMeshletVisible(meshlet, modelMatrix)) {
        //     return true;
        // }

        let parentBoundsWorld = vec4f(worldCenter(modelMatrix, meshlet.bounding_sphere.xyz), meshlet.bounding_sphere.w * radiusScale);
        let boundsWorld = vec4f(worldCenter(modelMatrix, meshlet.parent_bounding_sphere.xyz), meshlet.parent_bounding_sphere.w * radiusScale);

        let threshold = meshletParamsBuffer.dynamicLODErrorThresholdValue / frameBuffer.projectionOutputSize.y;
        let proj = frameBuffer.projectionMatrix[1][1];
        
        let parentError = boundsError(parentBoundsWorld, meshlet.parent_error.x, frameBuffer.viewPosition.xyz, proj, frameBuffer.cameraNearFar.x);
        let error = boundsError(boundsWorld, meshlet.error.x, frameBuffer.viewPosition.xyz, proj, frameBuffer.cameraNearFar.x);
        if (!(parentError <= threshold && error > threshold)) {
            return true;
        }
    }
    
    // if (bool(frameBuffer.isBackFaceCullingEnabled)) {
    //     let axisWorld = worldDirection(modelMatrix, meshlet.cone_axis.xyz);
    //     let centerToCamera = centerWorld - frameBuffer.viewPosition.xyz;
    //     let distanceToCenter = length(centerToCamera);
    
    //     if (dot(centerToCamera, axisWorld) >= meshlet.cone_axis.w * distanceToCenter + worldRadius) {
    //         return true;
    //     }
    // }

    if (bool(meshletParamsBuffer.isFrustumCullingEnabled)) {
        for (var i = 0u; i < 6u; i++) {
            let distance = planeDistanceToPoint(frameBuffer.frustum[i].xyz, frameBuffer.frustum[i].w, centerWorld);
            if (distance < -worldRadius) {
                return true;
            }
        }
    }

    return false;
}

const blockSize: u32 = 4;

@compute @workgroup_size(blockSize, blockSize, blockSize)
fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
    let size = u32(ceil(pow(f32(meshletParamsBuffer.meshletCount), 1.0 / 3.0) / 4));
    let objectIndex = grid.x + (grid.y * size * blockSize) + (grid.z * size * size * blockSize * blockSize);

    if (objectIndex >= u32(meshletParamsBuffer.meshletCount)) {
        return;
    }

    let object = objectInfoBuffer[objectIndex];
    let meshlet = meshletInfoBuffer[object.meshletIndex];
    var lodMesh = lodMeshBuffer[object.lodMeshIndex];
    var meshMatrix = meshInfoBuffer[lodMesh.meshIndex].modelMatrix;

    if (!bool(meshletParamsBuffer.isDynamicLODEnabled) && lodMesh.lod != u32(meshletParamsBuffer.staticLODValue)) {
        return;
    }
    
    let visible = !IsFrustumCulled(meshlet, meshMatrix);
    // let visible = visibilityBuffer[objectIndex] > 0.5 && !IsFrustumCulled(meshlet, meshMatrix);

    if (visible) {
        // let base = 0u;

        // drawBuffer[base].vertexCount = 128 * 3;
        // drawBuffer[base].firstInstance = 0;
        // let countIndex = atomicAdd(&drawBuffer[base].instanceCount, 1u);
        // instanceInfoBuffer[countIndex].objectIndex = objectIndex;


        let mat = lodMesh.materialIndex;
        let first = drawBuffer[mat].firstInstance;
        let idx = atomicAdd(&drawBuffer[mat].instanceCount, 1u);
        instanceInfoBuffer[first + idx].objectIndex = objectIndex;
    }

}
