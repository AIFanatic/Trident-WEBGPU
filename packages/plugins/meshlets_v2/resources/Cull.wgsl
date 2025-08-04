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

fn conservativeErrorOverDistance(transform: mat4x4<f32>, boundingSphere: vec4f, objectSpaceQuadricError: f32) -> f32 {
    let radiusScale = 1.0;
    let maxError = objectSpaceQuadricError * radiusScale;
    
    let instanceToEye = transform;
    let sphereDistance    = length((instanceToEye * vec4f(boundingSphere.xyz, 1.0f)).xyz);

    let errorDistance = max(maxError, sphereDistance - boundingSphere.w * radiusScale);
    return maxError / errorDistance;
}

fn isMeshletVisible(meshlet: MeshletInfo, modelview: mat4x4<f32>) -> bool {
    let error = conservativeErrorOverDistance(
        modelview,
        meshlet.boundingSphere,
        meshlet.error.x
    );

    let parentError = conservativeErrorOverDistance(
        modelview,
        meshlet.parentBoundingSphere,
        meshlet.parentError.x
    );

    let errorOverDistanceThreshold: f32 = meshletSettings.dynamicLODErrorThreshold * 0.001;

    return error >= errorOverDistanceThreshold && parentError < errorOverDistanceThreshold;
}

fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
    return dot(normal, point) + constant;
}

fn IsFrustumCulled(meshlet: MeshletInfo, meshModelMatrix: mat4x4<f32>) -> bool {
    let meshPosition = vec3(meshModelMatrix[3][0], meshModelMatrix[3][1], meshModelMatrix[3][2]);

    let scaleX = length(vec3(meshModelMatrix[0][0], meshModelMatrix[0][1], meshModelMatrix[0][2]));
    let scaleY = length(vec3(meshModelMatrix[1][0], meshModelMatrix[1][1], meshModelMatrix[1][2]));
    let scaleZ = length(vec3(meshModelMatrix[2][0], meshModelMatrix[2][1], meshModelMatrix[2][2]));
    let meshScale = vec3(scaleX, scaleY, scaleZ);

    if (bool(meshletSettings.dynamicLODEnabled)) {
        if (!isMeshletVisible(meshlet, cullData.viewMatrix * meshModelMatrix)) {
            return true;
        }
    }
    else {
        if (!(u32(meshlet.lod.x) == u32(meshletSettings.staticLOD))) {
            return true;
        }
    }

    // Backface
    if (bool(meshletSettings.backFaceCullingEnabled)) {
        if (dot(normalize(meshlet.cone_apex.xyz - cullData.cameraPosition.xyz), meshlet.cone_axis.xyz) * meshScale.x >= meshlet.cone_cutoff) {
            return true;
        }
    }

    // Camera frustum
    if (bool(meshletSettings.frustumCullingEnabled)) {
        let boundingSphere = meshlet.boundingSphere * meshScale.x;
        let center = (cullData.viewMatrix * vec4(boundingSphere.xyz + meshPosition.xyz, 1.0)).xyz;
        let negRadius = -boundingSphere.w;

        for (var i = 0; i < 6; i++) {
            let distance = planeDistanceToPoint(cullData.frustum[i].xyz, cullData.frustum[i].w, center);

            if (distance < negRadius) {
                return true;
            }
        }
    }

    return false;
}

const blockSize: u32 = 4;

// @compute @workgroup_size(blockSizeX, blockSizeY, blockSizeZ)
@compute @workgroup_size(blockSize, blockSize, blockSize)
fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
    // let objectIndex = grid.z * (blockSizeX * blockSizeY) + grid.y * blockSizeX + grid.x;
    
    let size = u32(ceil(pow(cullData.meshCount, 1.0 / 3.0) / 4));
    let objectIndex = grid.x + (grid.y * size * blockSize) + (grid.z * size * size * blockSize * blockSize);


    if (objectIndex >= u32(cullData.meshCount)) {
        return;
    }

    let object = objectInfo[objectIndex];
    let meshlet = meshletInfo[u32(object.meshletID)];
    var meshMatrixInfo = meshMatrixInfo[u32(object.meshID)];
    // meshMatrixInfo.modelMatrix = mesh.modelMatrix;
    // meshMatrixInfo.position = mesh.position;
    // meshMatrixInfo.scale = mesh.scale;

    var bVisible = visibilityBuffer[objectIndex] > 0.5 && !IsFrustumCulled(meshlet, meshMatrixInfo.modelMatrix);

    if (bVisible) {
        drawBuffer.vertexCount = u32(meshletSettings.maxTriangles * 3);
        let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
        instanceInfo[countIndex].meshID = objectIndex;
    }
} 