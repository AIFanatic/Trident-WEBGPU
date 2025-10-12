#include "./CullStructs.wgsl"
#include "./SettingsStructs.wgsl"

struct DrawBuffer {
    vertexCount: u32,
    instanceCount: atomic<u32>,
    firstVertex: u32,
    firstInstance: u32,
};

@group(0) @binding(0) var<storage, read_write> drawBuffer: DrawBuffer;
@group(0) @binding(1) var<storage, read_write> instanceInfo: array<InstanceInfo>;
@group(0) @binding(2) var<storage, read> cullData: CullData;
@group(0) @binding(3) var<storage, read> meshletInfo: array<MeshletInfo>;
@group(0) @binding(4) var<storage, read> objectInfo: array<ObjectInfo>;
@group(0) @binding(5) var<storage, read> meshMatrixInfo: array<MeshMatrixInfo>;

@group(0) @binding(6) var<storage, read_write> visibilityBuffer: array<f32>;
@group(0) @binding(7) var<storage, read> bPrepass: f32;

@group(0) @binding(8) var textureSampler: sampler;
@group(0) @binding(9) var depthTexture: texture_depth_2d;

@group(0) @binding(10) var<storage, read> meshletSettings: MeshletSettings;

fn computeRadiusScale(modelMatrix: mat4x4<f32>) -> f32 {
    let sx = length(modelMatrix[0].xyz);
    let sy = length(modelMatrix[1].xyz);
    let sz = length(modelMatrix[2].xyz);
    return max(sx, max(sy, sz));
}

fn worldCenter(modelMatrix: mat4x4<f32>, localCenter: vec3f) -> vec3f {
    return (modelMatrix * vec4f(localCenter, 1.0)).xyz;
}

fn viewCenter(worldPos: vec3f) -> vec3f {
    return (cullData.viewMatrix * vec4f(worldPos, 1.0)).xyz;
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

fn conservativeErrorOverDistance(modelMatrix: mat4x4<f32>, boundingSphere: vec4f, objectSpaceError: f32) -> f32 {
    let centerWorld = worldCenter(modelMatrix, boundingSphere.xyz);
    let centerView = viewCenter(centerWorld);
    let radiusScale = computeRadiusScale(modelMatrix);

    let scaledError = objectSpaceError * radiusScale;
    let worldRadius = boundingSphere.w * radiusScale;

    let sphereDistance = length(centerView);
    let errorDistance = max(scaledError, sphereDistance - worldRadius);
    return scaledError / errorDistance;
}

fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
    return dot(normal, point) + constant;
}

fn isMeshletVisible(meshlet: MeshletInfo, modelMatrix: mat4x4<f32>) -> bool {
    let error = conservativeErrorOverDistance(modelMatrix, meshlet.boundingSphere, meshlet.error.x);
    let parentError = conservativeErrorOverDistance(modelMatrix, meshlet.parentBoundingSphere, meshlet.parentError.x);

    let errorThreshold = meshletSettings.dynamicLODErrorThreshold * 0.001;
    return error >= errorThreshold && parentError < errorThreshold;
}

fn IsFrustumCulled(meshlet: MeshletInfo, modelMatrix: mat4x4<f32>) -> bool {
    let radiusScale = computeRadiusScale(modelMatrix);
    let centerWorld = worldCenter(modelMatrix, meshlet.boundingSphere.xyz);
    let centerView = viewCenter(centerWorld);
    let worldRadius = meshlet.boundingSphere.w * radiusScale;

    if (bool(meshletSettings.dynamicLODEnabled)) {
        if (!isMeshletVisible(meshlet, modelMatrix)) {
            return true;
        }
    } else {
        if (u32(meshlet.lod.x) != u32(meshletSettings.staticLOD)) {
            return true;
        }
    }

    if (bool(meshletSettings.backFaceCullingEnabled)) {
        let apexWorld = worldCenter(modelMatrix, meshlet.cone_apex.xyz);
        let axisWorld = worldDirection(modelMatrix, meshlet.cone_axis.xyz);
        let toCamera = normalize(cullData.cameraPosition.xyz - apexWorld);
        if (dot(toCamera, axisWorld) >= meshlet.cone_cutoff) {
            return true;
        }
    }

    if (bool(meshletSettings.frustumCullingEnabled)) {
        for (var i = 0u; i < 6u; i++) {
            let distance = planeDistanceToPoint(cullData.frustum[i].xyz, cullData.frustum[i].w, centerView);
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
    let size = u32(ceil(pow(cullData.meshCount, 1.0 / 3.0) / 4));
    let objectIndex = grid.x + (grid.y * size * blockSize) + (grid.z * size * size * blockSize * blockSize);

    if (objectIndex >= u32(cullData.meshCount)) {
        return;
    }

    let object = objectInfo[objectIndex];
    let meshlet = meshletInfo[u32(object.meshletID)];
    var meshMatrix = meshMatrixInfo[u32(object.meshID)].modelMatrix;

    let visible = visibilityBuffer[objectIndex] > 0.5 && !IsFrustumCulled(meshlet, meshMatrix);

    if (visible) {
        drawBuffer.vertexCount = u32(meshletSettings.maxTriangles * 3.0);
        let countIndex = atomicAdd(&drawBuffer.instanceCount, 1u);
        instanceInfo[countIndex].meshID = objectIndex;
    }
}