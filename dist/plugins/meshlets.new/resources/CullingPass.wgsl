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
@group(0) @binding(8) var<storage, read> groupInfoBuffer: array<GroupInfo>;
// Layout: visibleBuffer[0 .. groupCount)             → per-group atomic survivor counts
//         visibleBuffer[groupCount .. )              → per-group instance index lists,
//                                                      each group's slice starts at group.visibleOffset.
@group(0) @binding(9) var<storage, read_write> visibleBuffer: array<atomic<u32>>;

fn computeRadiusScale(modelMatrix: mat4x4<f32>) -> f32 {
    let sx = length(modelMatrix[0].xyz);
    let sy = length(modelMatrix[1].xyz);
    let sz = length(modelMatrix[2].xyz);
    return max(sx, max(sy, sz));
}

fn worldCenter(modelMatrix: mat4x4<f32>, localCenter: vec3f) -> vec3f {
    return (modelMatrix * vec4f(localCenter, 1.0)).xyz;
}

fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
    return dot(normal, point) + constant;
}

fn IsSphereOutsideFrustum(centerWorld: vec3f, worldRadius: f32) -> bool {
    for (var i = 0u; i < 6u; i++) {
        let d = planeDistanceToPoint(frameBuffer.frustum[i].xyz, frameBuffer.frustum[i].w, centerWorld);
        if (d < -worldRadius) { return true; }
    }
    return false;
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

fn IsMeshletCulled(meshlet: MeshletInfo, modelMatrix: mat4x4<f32>) -> bool {
    let radiusScale = computeRadiusScale(modelMatrix);
    let centerWorld = worldCenter(modelMatrix, meshlet.bounding_sphere.xyz);
    let worldRadius = meshlet.bounding_sphere.w * radiusScale;

    if (bool(meshletParamsBuffer.isFrustumCullingEnabled)) {
        if (IsSphereOutsideFrustum(centerWorld, worldRadius)) { return true; }
    }

    if (bool(meshletParamsBuffer.isSmallFeaturesCullingEnabled)) {
        let viewDist = max(distance(frameBuffer.viewPosition.xyz, centerWorld), 0.0001);
        let proj = frameBuffer.projectionMatrix[1][1];
        let screenPx = worldRadius * proj * frameBuffer.projectionOutputSize.y * 0.5 / viewDist;
        if (screenPx < 1.0) { return true; }
    }

    if (bool(meshletParamsBuffer.isDynamicLODEnabled)) {
        // Render this meshlet only when its own error fits the budget but its parent's doesn't —
        // standard nanite LOD selection.
        let ownBounds    = vec4f(centerWorld, worldRadius);
        let parentBounds = vec4f(
            worldCenter(modelMatrix, meshlet.parent_bounding_sphere.xyz),
            meshlet.parent_bounding_sphere.w * radiusScale,
        );

        let threshold = meshletParamsBuffer.dynamicLODErrorThresholdValue / frameBuffer.projectionOutputSize.y;
        let proj      = frameBuffer.projectionMatrix[1][1];

        let ownError    = boundsError(ownBounds,    meshlet.error.x,        frameBuffer.viewPosition.xyz, proj, frameBuffer.cameraNearFar.x);
        let parentError = boundsError(parentBounds, meshlet.parent_error.x, frameBuffer.viewPosition.xyz, proj, frameBuffer.cameraNearFar.x);

        // Root meshlets have no parent above them — Meshoptimizer encodes that as parent_error == 0.
        // Treat their parent error as effectively infinite so they remain the fallback at long range.
        let isRoot = meshlet.parent_error.x == 0.0;
        if (!(ownError <= threshold && (isRoot || parentError > threshold))) { return true; }
    }

    return false;
}

@compute @workgroup_size(1, 256, 1)
fn perInstance(@builtin(global_invocation_id) gid: vec3<u32>) {
    let groupIndex = gid.x;
    if (groupIndex >= meshletParamsBuffer.groupCount) { return; }

    let group = groupInfoBuffer[groupIndex];
    let instanceIndex = gid.y;
    if (instanceIndex >= group.instanceCount) { return; }

    let model = meshInfoBuffer[group.matrixBase + instanceIndex].modelMatrix;

    if (bool(meshletParamsBuffer.isFrustumCullingEnabled)) {
        let radiusScale = computeRadiusScale(model);
        let centerWorld = worldCenter(model, group.boundingSphere.xyz);
        let worldRadius = group.boundingSphere.w * radiusScale;
        if (IsSphereOutsideFrustum(centerWorld, worldRadius)) { return; }
    }

    let slot = atomicAdd(&visibleBuffer[groupIndex], 1u);
    atomicStore(&visibleBuffer[group.visibleOffset + slot], instanceIndex);
}

@compute @workgroup_size(8, 32, 1)
fn perMeshlet(@builtin(global_invocation_id) gid: vec3<u32>) {
    let objectIndex = gid.x;
    if (objectIndex >= meshletParamsBuffer.meshletCount) { return; }

    let object = objectInfoBuffer[objectIndex];
    let lodMesh = lodMeshBuffer[object.lodMeshIndex];

    let visibleN = atomicLoad(&visibleBuffer[lodMesh.groupIndex]);
    if (gid.y >= visibleN) { return; }

    if (!bool(meshletParamsBuffer.isDynamicLODEnabled) && lodMesh.lod != u32(meshletParamsBuffer.staticLODValue)) {
        return;
    }

    let group = groupInfoBuffer[lodMesh.groupIndex];
    let instanceIndex = atomicLoad(&visibleBuffer[group.visibleOffset + gid.y]);

    let meshlet = meshletInfoBuffer[object.meshletIndex];
    let meshMatrix = meshInfoBuffer[lodMesh.meshIndex + instanceIndex].modelMatrix;

    if (IsMeshletCulled(meshlet, meshMatrix)) { return; }

    let mat = lodMesh.materialIndex;
    let first = drawBuffer[mat].firstInstance;
    let idx = atomicAdd(&drawBuffer[mat].instanceCount, 1u);
    instanceInfoBuffer[first + idx].objectIndex = objectIndex;
    instanceInfoBuffer[first + idx].instanceIndex = instanceIndex;
}
