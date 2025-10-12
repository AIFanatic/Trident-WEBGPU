#include "./Structs.wgsl"

@group(0) @binding(0) var<storage, read_write> drawBuffer: DrawBuffer;
@group(0) @binding(1) var<storage, read_write> instanceInfoBuffer: array<InstanceInfo>;
@group(0) @binding(2) var<storage, read> frameBuffer: FrameBuffer;
@group(0) @binding(3) var<storage, read> meshletInfoBuffer: array<MeshletInfo>;
@group(0) @binding(4) var<storage, read> meshInfoBuffer: array<MeshInfo>;
@group(0) @binding(5) var<storage, read> lodMeshBuffer: array<LodMeshInfo>;
@group(0) @binding(6) var<storage, read> objectInfoBuffer: array<ObjectInfo>;

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
    return (frameBuffer.viewMatrix * vec4f(worldPos, 1.0)).xyz;
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
    let error = conservativeErrorOverDistance(modelMatrix, meshlet.bounding_sphere, meshlet.errors.y);
    let parentError = conservativeErrorOverDistance(modelMatrix, meshlet.parent_bounding_sphere, meshlet.errors.x);

    let errorThreshold = frameBuffer.dynamicLODErrorThresholdValue * 0.001;
    return error >= errorThreshold && parentError < errorThreshold;
}

fn IsFrustumCulled(meshlet: MeshletInfo, modelMatrix: mat4x4<f32>) -> bool {
    let radiusScale = computeRadiusScale(modelMatrix);
    let centerWorld = worldCenter(modelMatrix, meshlet.bounding_sphere.xyz);
    let centerView = viewCenter(centerWorld);
    let worldRadius = meshlet.bounding_sphere.w * radiusScale;

    if (bool(frameBuffer.isDynamicLODEnabled)) {
        if (!isMeshletVisible(meshlet, modelMatrix)) {
            return true;
        }
    }
    
    if (bool(frameBuffer.isBackFaceCullingEnabled)) {
        let axisWorld = worldDirection(modelMatrix, meshlet.cone_axis.xyz);
        let centerToCamera = centerWorld - frameBuffer.cameraPosition.xyz;
        let distanceToCenter = length(centerToCamera);
    
        if (dot(centerToCamera, axisWorld) >= meshlet.cone_axis.w * distanceToCenter + worldRadius) {
            return true;
        }
    }

    if (bool(frameBuffer.isFrustumCullingEnabled)) {
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
    let size = u32(ceil(pow(frameBuffer.meshletCount, 1.0 / 3.0) / 4));
    let objectIndex = grid.x + (grid.y * size * blockSize) + (grid.z * size * size * blockSize * blockSize);

    if (objectIndex >= u32(frameBuffer.meshletCount)) {
        return;
    }

    let object = objectInfoBuffer[objectIndex];
    let meshlet = meshletInfoBuffer[object.meshletIndex];
    var lodMesh = lodMeshBuffer[object.lodMeshIndex];
    var meshMatrix = meshInfoBuffer[lodMesh.meshIndex].modelMatrix;

    if (!bool(frameBuffer.isDynamicLODEnabled) && lodMesh.lod != u32(frameBuffer.staticLODValue)) {
        return;
    }

    let visible = !IsFrustumCulled(meshlet, meshMatrix);
    // let visible = visibilityBuffer[objectIndex] > 0.5 && !IsFrustumCulled(meshlet, meshMatrix);

    if (visible) {
        // drawBuffer.vertexCount = u32(meshletSettings.maxTriangles * 3.0);
        // let countIndex = atomicAdd(&drawBuffer.instanceCount, 1u);
        // instanceInfo[countIndex].meshID = objectIndex;

        drawBuffer.vertexCount = 128 * 3;
        let countIndex = atomicAdd(&drawBuffer.instanceCount, 1u);
        instanceInfoBuffer[countIndex].objectIndex = objectIndex;
    }

}