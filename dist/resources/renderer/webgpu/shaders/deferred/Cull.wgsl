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
@group(0) @binding(10) var<storage, read> settings: Settings;

// assume a fixed resolution and fov
const PI = 3.141592653589793;
const testFOV = PI * 0.5;
const cotHalfFov = 1.0 / tan(testFOV / 2.0);

fn transformSphere(sphere: vec4<f32>, transform: mat4x4<f32>) -> vec4<f32> {
    var hCenter = vec4(sphere.xyz, 1.0);
    hCenter = transform * hCenter;
    let center = hCenter.xyz / hCenter.w;
    return vec4(center, length((transform * vec4(sphere.w, 0, 0, 0)).xyz));
}

// project given transformed (ie in view space) sphere to an error value in pixels
// xyz is center of sphere
// w is radius of sphere
fn projectErrorToScreen(transformedSphere: vec4<f32>) -> f32 {
    // https://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
    if (transformedSphere.w > 1000000.0) {
        return transformedSphere.w;
    }
    let d2 = dot(transformedSphere.xyz, transformedSphere.xyz);
    let r = transformedSphere.w;
    return cullData.screenSize.y * cotHalfFov * r / sqrt(d2 - r*r);
}


fn isMeshletVisible(meshlet: MeshletInfo, modelview: mat4x4<f32>) -> bool {
    var projectedBounds = vec4(meshlet.boundingSphere.xyz, max(meshlet.error.x, 10e-10f));
    projectedBounds = transformSphere(projectedBounds, modelview);

    var parentProjectedBounds = vec4(meshlet.parentBoundingSphere.xyz, max(meshlet.parentError.x, 10e-10f));
    parentProjectedBounds = transformSphere(parentProjectedBounds, modelview);

    let clusterError = projectErrorToScreen(projectedBounds);
    let parentError = projectErrorToScreen(parentProjectedBounds);
    return clusterError <= settings.dynamicLODErrorThreshold && parentError > settings.dynamicLODErrorThreshold;
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

    if (bool(settings.dynamicLODEnabled)) {
        if (!isMeshletVisible(meshlet, cullData.viewMatrix * meshModelMatrix)) {
            return true;
        }
    }
    else {
        if (!(u32(meshlet.lod.x) == u32(settings.staticLOD))) {
            return true;
        }
    }

    // Backface
    if (bool(settings.backFaceCullingEnabled)) {
        if (dot(normalize(meshlet.cone_apex.xyz - cullData.cameraPosition.xyz), meshlet.cone_axis.xyz) * meshScale.x >= meshlet.cone_cutoff) {
            return true;
        }
    }

    // Camera frustum
    if (bool(settings.frustumCullingEnabled)) {
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

fn IsOccluded(meshlet: MeshletInfo, meshModelMatrix: mat4x4<f32>) -> bool {
    let bmin = -vec3f(meshlet.boundingSphere.w);
    let bmax = vec3f(meshlet.boundingSphere.w);
    let bboxMin = (cullData.viewMatrix * meshModelMatrix * vec4(bmin + meshlet.boundingSphere.xyz, 1.0)).xyz;
    let bboxMax = (cullData.viewMatrix * meshModelMatrix * vec4(bmax + meshlet.boundingSphere.xyz, 1.0)).xyz;
    
    let boxSize = bboxMax - bboxMin;

    let boxCorners: array<vec3f, 8> = array(bboxMin.xyz,
        bboxMin.xyz + vec3f(boxSize.x,0,0),
        bboxMin.xyz + vec3f(0, boxSize.y,0),
        bboxMin.xyz + vec3f(0, 0, boxSize.z),
        bboxMin.xyz + vec3f(boxSize.xy,0),
        bboxMin.xyz + vec3f(0, boxSize.yz),
        bboxMin.xyz + vec3f(boxSize.x, 0, boxSize.z),
        bboxMin.xyz + boxSize.xyz
    );


    var minZ = 1.0;
    var minXY = vec2f(1);
    var maxXY = vec2f(0);

    for (var i = 0; i < 8; i++) {
        //transform world space aaBox to NDC
        var clipPos = cullData.projectionMatrix * vec4f(boxCorners[i], 1);

        clipPos.z = max(clipPos.z, 0);

        let _a = clipPos.xyz / clipPos.w;
        clipPos.x = _a.x;
        clipPos.y = _a.y;
        clipPos.z = _a.z;

        let _b = clamp(clipPos.xy, vec2f(-1.0), vec2f(1.0));
        clipPos.x = _b.x;
        clipPos.y = _b.y;
        
        let _c = clipPos.xy * vec2f(0.5, -0.5) + vec2f(0.5, 0.5);
        clipPos.x = _c.x;
        clipPos.y = _c.y;

        minXY = min(clipPos.xy, minXY);
        maxXY = max(clipPos.xy, maxXY);

        minZ = saturate(min(minZ, clipPos.z));
    }

    let boxUVs = vec4f(minXY, maxXY);

    // Calculate hi-Z buffer mip
    let depthTextureSize = textureDimensions(depthTexture, 0);
    let RTSize = vec2f(depthTextureSize.xy);
    let MaxMipLevel = 10;

    let size = vec2((maxXY - minXY)) * RTSize.xy;
    var mip = ceil(log2(f32(max(size.x, size.y))));

    mip = clamp(mip, 0, f32(MaxMipLevel));


    // small-feature culling
    let _size = (maxXY.xy - minXY.xy);
    let maxsize = max(_size.x, _size.y) * f32(max(depthTextureSize.x,depthTextureSize.y));
    if (bool(settings.smallFeaturesCullingEnabled)) {
        if(maxsize <= 1.0f) {
            return true;
        }
    }



    // Texel footprint for the lower (finer-grained) level
    let level_lower = max(mip - 1, 0);
    let _scale = exp2(-level_lower);
    // let _scale = exp2(-level_lower) * 1024.0;
    let a = floor(boxUVs.xy*_scale);
    let b = ceil(boxUVs.zw*_scale);
    let dims = b - a;

    // Use the lower level if we only touch <= 2 texels in both dimensions
    if (dims.x <= 2 && dims.y <= 2) {
        mip = level_lower;
    }

    //load depths from high z buffer
    let depth = vec4f(
        textureSampleLevel(depthTexture, textureSampler, boxUVs.xy, u32(mip)),
        textureSampleLevel(depthTexture, textureSampler, boxUVs.zy, u32(mip)),
        textureSampleLevel(depthTexture, textureSampler, boxUVs.xw, u32(mip)),
        textureSampleLevel(depthTexture, textureSampler, boxUVs.zw, u32(mip))
    );

    //find the max depth
    let maxDepth = max(max(max(depth.x, depth.y), depth.z), depth.w);

    return minZ > maxDepth;
}

// const blockSizeX: u32 = ${workgroupSize};
// const blockSizeY: u32 = 1;
// const blockSizeZ: u32 = 1;

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

    var bVisible = true;
    if (bool(bPrepass)) {
        bVisible = visibilityBuffer[objectIndex] > 0.5;
    }

    if (bVisible) {
        bVisible = bVisible && !IsFrustumCulled(meshlet, meshMatrixInfo.modelMatrix);
    }

    if (!bool(bPrepass)) {
        if (bool(settings.occlusionCullingEnabled)) {
            if (bVisible) {
                // TODO: IsOccluded should be !isOccluded?
                bVisible = bVisible && !IsOccluded(meshlet, meshMatrixInfo.modelMatrix);
            }
        }
    }

    var bDrawMesh = false;
    if (bool(bPrepass)) {
        bDrawMesh = bVisible;
    }
    else {
        bDrawMesh = bVisible && visibilityBuffer[objectIndex] < 0.5;
    }

    if (bDrawMesh) {
        drawBuffer.vertexCount = u32(settings.maxTriangles * 3);
        let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
        instanceInfo[countIndex].meshID = objectIndex;
    }

    if (!bool(bPrepass)) {
        visibilityBuffer[objectIndex] = f32(bVisible);
    }
} 