import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { DepthTexture, RenderTexture, Texture } from "../Texture";
import { Buffer, BufferType } from "../Buffer";
import { Camera } from "../../components/Camera";

export class OcclusionCullingDebugger extends RenderPass {
    public name: string = "OcclusionCullingDebugger";
    private shader: Shader;
    private quadGeometry: Geometry;

    private fontTexture: Texture;

    constructor() {
        super({});

        const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<f32>;






        struct CullData {
            projectionMatrix: mat4x4<f32>,
            viewMatrix: mat4x4<f32>,
            cameraPosition: vec4<f32>,
            frustum: array<vec4<f32>, 6>,
            meshCount: vec4<f32>,
            screenSize: vec4<f32>,
            cameraNearFar: vec4<f32>,
            projectionMatrixTransposed: mat4x4<f32>,
        };

        @group(0) @binding(2) var<storage, read> cullData: CullData;
        

        struct MeshletInfo {
            cone_apex: vec4<f32>,
            cone_axis: vec4<f32>,
            cone_cutoff: f32,

            boundingSphere: vec4<f32>,
            parentBoundingSphere: vec4<f32>,
            error: vec4<f32>,
            parentError: vec4<f32>,
            lod: vec4<f32>,

            bboxMin: vec4<f32>,
            bboxMax: vec4<f32>,
        };

        struct MeshInfo {
            modelMatrix: mat4x4<f32>,
            position: vec4<f32>,
            scale: vec4<f32>
        };

        struct ObjectInfo {
            meshID: f32,
            meshletID: f32,
            padding: vec2<f32>,
        };

        @group(0) @binding(3) var<storage, read> meshletInfo: array<MeshletInfo>;
        @group(0) @binding(4) var<storage, read> meshInfo: array<MeshInfo>;
        @group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;

        @group(0) @binding(6) var depthTexture: texture_depth_2d;

        @group(0) @binding(7) var fontTexture: texture_2d<f32>;

        
        @group(0) @binding(8) var<storage, read> projectionMatrix: mat4x4<f32>;
        @group(0) @binding(9) var<storage, read> viewMatrix: mat4x4<f32>;

        
        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }


        // ---- TEXT STUFF ---- //
        const _A = 65;
        const _B = 66;
        const _C = 67;
        const _D = 68;
        const _E = 69;
        const _F = 70;
        const _G = 71;
        const _H = 72;
        const _I = 73;
        const _J = 74;
        const _K = 75;
        const _L = 76;
        const _M = 77;
        const _N = 78;
        const _O = 79;
        const _P = 80;
        const _Q = 81;
        const _R = 82;
        const _S = 83;
        const _T = 84;
        const _U = 85;
        const _V = 86;
        const _W = 87;
        const _X = 88;
        const _Y = 89;
        const _Z = 90;

        const _0 = 48;
        const _1 = 49;
        const _2 = 50;
        const _3 = 51;
        const _4 = 52;
        const _5 = 53;
        const _6 = 54;
        const _7 = 55;
        const _8 = 56;
        const _9 = 57;

        const _SPACE = 127;

        const _SUB = 45; // " - "
        const _DOT = 46; // " . "

        fn char(p: vec2<f32>, c: u32) -> vec4<f32> {
            let rowIndex = c / 16;
            let columnIndex = c % 16;

            var textureCoord = p / 16.0 + vec2<f32>(f32(columnIndex), f32(rowIndex)) / 16.0;
            let charSize = p / 16.0;
            // let sample = textureSample(fontTexture, textureSampler, textureCoord);
            let dims = vec2f(textureDimensions(fontTexture));
            let sample = textureLoad(fontTexture, vec2u(textureCoord * dims), 0);
            if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
                return vec4<f32>(0.0, 0.0, 0.0, 1e5);
            }
            return sample;
        }

        
        var<private> text: array<u32, 128>;
        fn print(p: vec2f) -> f32 {
            var U = p;
            var color = 0.0;
            for (var i = 0u; i < l; i++) {
                let c = text[i];
                color += char(U, c).x;
                U.x -= 0.5;
            }
            return color;
        }

        var<private> l: u32;

        fn C(char: u32) {
            text[l] = char;
            l++;
        }

        // Floating point debug
        fn F(_n: f32, decimals: u32) {
            var N = 1.0; // d is the final color, N the number of digits before the decimal
            var n = _n;

            if (n < 0.) {  // If the number is negative
                n *= -1.;  // Make it positive
                C(_SUB);
            }
            
            // Calculate the number of digits before the decimal point
            for (var x = n; x >= 10.0; x /= 10.0) {
                N += 1.0;
            }

            // Print the digits before the decimal point
            for (var i = 0.0; i < N; i+=1.0) {        
                let magnitude = pow(10., N-i-1.);
                let leftDigit = floor(n / magnitude);
                n -= leftDigit * magnitude;
                C(48 + u32(leftDigit));
            }

            if (decimals == 0) {
                return;
            }

            C(_DOT);
            
            // Print the digits after the decimal point
            for (var i = 0u; i < decimals; i++) {
                let firstDecimal = floor((n - floor(n)) * 10.);
                n *= 10.;
                C(48 + u32(firstDecimal));
            }
        }
        // -- END TEXT STUFF -- //

        struct Projected {
            ret: bool,
            aabb: vec4f,
        };

        fn projectSphere(C: vec3f, r: f32, nearZ: f32, P00: f32, P11: f32) -> Projected {
            var projected: Projected;

            let r2 = r;

            if (-C.z < r2 + nearZ) {
                projected.ret = false;
                return projected;
            }
    
            let c = vec3f(C.x, C.y, -C.z);
            let cr = c * r2;
            let czr2 = c.z * c.z - r2 * r2;
        
            let vx = sqrt(c.x * c.x + czr2);
            let minx = (vx * c.x - cr.z) / (vx * c.z + cr.x);
            let maxx = (vx * c.x + cr.z) / (vx * c.z - cr.x);
        
            let vy = sqrt(c.y * c.y + czr2);
            let miny = (vy * c.y - cr.z) / (vy * c.z + cr.y);
            let maxy = (vy * c.y + cr.z) / (vy * c.z - cr.y);

            projected.aabb = vec4(minx * P00, miny * P11, maxx * P00, maxy * P11);
            projected.aabb = projected.aabb.xwzy * vec4(0.5f, -0.5f, 0.5f, -0.5f) + vec4(0.5f); // clip space -> uv space
        
            projected.ret = true;
            return projected;
        }

        fn projectBox(bmin: vec3f, bmax: vec3f, znear: f32, viewProjection: mat4x4<f32>) -> Projected {
            var projected: Projected;

            let SX = vec4(bmax.x - bmin.x, 0.0, 0.0, 0.0) * viewProjection;
            let SY = vec4(0.0, bmax.y - bmin.y, 0.0, 0.0) * viewProjection;
            let SZ = vec4(0.0, 0.0, bmax.z - bmin.z, 0.0) * viewProjection;
        
            let P0 = vec4(bmin.x, bmin.y, bmin.z, 1.0) * viewProjection;
            let P1 = P0 + SZ;
            let P2 = P0 + SY;
            let P3 = P2 + SZ;
            let P4 = P0 + SX;
            let P5 = P4 + SZ;
            let P6 = P4 + SY;
            let P7 = P6 + SZ;
        
            if (min(min(min(P0.w, P1.w), min(P2.w, P3.w)), min(min(P4.w, P5.w), min(P6.w, P7.w))) < znear) {
                projected.ret = false;
                return projected;
            }
        
            let xy = min(
                min(min(P0.xy / P0.w, P1.xy / P1.w), min(P2.xy / P2.w, P3.xy / P3.w)),
                min(min(P4.xy / P4.w, P5.xy / P5.w), min(P6.xy / P6.w, P7.xy / P7.w)));

            projected.aabb.x = xy.x;
            projected.aabb.y = xy.y;

            let zw = max(
                max(max(P0.xy / P0.w, P1.xy / P1.w), max(P2.xy / P2.w, P3.xy / P3.w)),
                max(max(P4.xy / P4.w, P5.xy / P5.w), max(P6.xy / P6.w, P7.xy / P7.w)));

            projected.aabb.z = zw.x;
            projected.aabb.w = zw.y;
        
            // clip space -> uv space
            projected.aabb = projected.aabb.xwzy * vec4(0.5f, -0.5f, 0.5f, -0.5f) + vec4(0.5f);
        
            projected.ret = true;
            return projected;
        }

        fn projectBoxView(c: vec3f, r: vec3f, znear: f32, P00: f32, P11: f32) -> Projected {
            var projected: Projected;
            // if (c.z - r.z < znear) {
            //     projected.ret = false;
            //     return projected;
            // }

            // when we're computing the extremum of projection along an axis, the maximum
            // is reached by front face for positive and by back face for negative values
            let rminz = 1 / (c.z - r.z);
            let rmaxz = 1 / (c.z + r.z);
            var a0 = rminz; if (c.x - r.x >= 0) { a0 = rmaxz; }
            var a1 = rmaxz; if (c.x + r.x >= 0) { a1 = rminz; }
            var a2 = rminz; if (c.y - r.y >= 0) { a2 = rmaxz; }
            var a3 = rmaxz; if (c.y + r.y >= 0) { a3 = rminz; }

            let minx = (c.x - r.x) * a0; // (c.x - r.x >= 0 ? rmaxz : rminz);
            let maxx = (c.x + r.x) * a1; // (c.x + r.x >= 0 ? rminz : rmaxz);
            let miny = (c.y - r.y) * a2; // (c.y - r.y >= 0 ? rmaxz : rminz);
            let maxy = (c.y + r.y) * a3; // (c.y + r.y >= 0 ? rminz : rmaxz);

            projected.aabb = vec4(minx * P00, miny * P11, maxx * P00, maxy * P11);
            // clip space -> uv space
            projected.aabb = projected.aabb.xwzy * vec4(0.5f, -0.5f, 0.5f, -0.5f) + vec4(0.5f);

            projected.ret = true;
            return projected;
        }

        fn projectSphere2(C: vec3<f32>, r: f32, projectionMatrix: mat4x4<f32>) -> Projected {
            var points: array<vec3<f32>, 8> = array<vec3<f32>, 8>(
                C + vec3<f32>(r, r, r), C + vec3<f32>(r, r, -r),
                C + vec3<f32>(r, -r, r), C + vec3<f32>(r, -r, -r),
                C + vec3<f32>(-r, r, r), C + vec3<f32>(-r, r, -r),
                C + vec3<f32>(-r, -r, r), C + vec3<f32>(-r, -r, -r)
            );
        
            var minx: f32 = 100000000.0;
            var maxx: f32 = -100000000.0;
            var miny: f32 = 100000000.0;
            var maxy: f32 = -100000000.0;
        
            for (var i = 0u; i < 8u; i = i + 1u) {
                let projected = projectionMatrix * vec4<f32>(points[i], 1.0);
                let proj_x = projected.x / projected.w;
                let proj_y = projected.y / projected.w;
        
                minx = min(minx, proj_x);
                maxx = max(maxx, proj_x);
                miny = min(miny, proj_y);
                maxy = max(maxy, proj_y);
            }
        
            var projected: Projected;
            projected.aabb = vec4<f32>(minx, miny, maxx, maxy);
            projected.aabb = projected.aabb.xwzy * vec4(0.5f, -0.5f, 0.5f, -0.5f) + vec4(0.5f);
            projected.ret = true;
            return projected;
        }

        fn isVisibleV1(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            let m = cullData.projectionMatrix;
            let P00 = m[0][0];
            let P11 = m[1][1];
            let zNear = m[3][2];

            let scale = mesh.scale.x;
            let boundingSphere = meshlet.boundingSphere * scale;
            let center = (cullData.viewMatrix * vec4(mesh.position.xyz, 1.0)).xyz;
            let radius = boundingSphere.w * 0.5;

            // let projected = projectSphere(center, radius, zNear, P00, P11);
            let projected = projectSphere2(center, radius, m);

            // // fn projectBox(bmin: vec3f, bmax: vec3f, znear: f32, viewProjection: mat4x4<f32>) -> Projected {
            // let bboxMin = (cullData.viewMatrix * vec4(meshlet.bboxMin.xyz + mesh.position.xyz, 1.0)).xyz;
            // let bboxMax = (cullData.viewMatrix * vec4(meshlet.bboxMax.xyz + mesh.position.xyz, 1.0)).xyz;
            // let projected = projectBox(bboxMin, bboxMax, zNear, m);
            
            // // fn projectBoxView(c: vec3f, r: vec3f, znear: f32, P00: f32, P11: f32) -> Projected {
            // let projected = projectBoxView((m * vec4f(center, 1.0)).xyz, vec3(radius), zNear, P00, P11);
                
            // let aabb = projected.aabb.xwzy * vec4(0.5f, -0.5f, 0.5f, -0.5f) + vec4(0.5f);
            let aabb = projected.aabb;
            // projected.aabb = projected.aabb.xwzy * vec4(0.5f, -0.5f, 0.5f, -0.5f) + vec4(0.5f);
            

            if (projected.ret) {
                if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {
                // if (uv.x >= aabb.x) {
                    color.g += 0.5;


                    // let width = (aabb.z - aabb.x) * 1024; // cullData.depthPyramidSize.x;
                    // let height = (aabb.w - aabb.y) * 1024; // cullData.depthPyramidSize.y;
    
                    // let level = u32(ceil(log2(max(width, height))));
                    // // let level = u32(floor(log2(max(width, height))));
    
                    // let depth = textureSampleLevel(depthTexture, textureSampler, (aabb.xy + aabb.zw) * 0.5, level);
                    // let depthSphere = zNear / (center.z - radius);
                    // let visible = depthSphere + 1.0 > depth;

                    // var U = (uv - aabb.xy) * 75.0;
    
                    // l = 0; C(_V); C(_I); C(_S); C(_I); C(_B); C(_L); C(_E); C(_SPACE); F(f32(visible), 0);
                    // color.r += print(U);

                    // U.y -= 1.0;
                    // l = 0; C(_D); C(_E); C(_P); C(_T); C(_H); C(_SPACE); F(f32(depth), 2);
                    // color.r += print(U);
    
                    // U.y -= 1.0;
                    // l = 0; C(_D); C(_E); C(_P); C(_T); C(_H); C(_S); C(_SPACE); F(f32(depthSphere), 2);
                    // color.r += print(U);
                }
            }



            if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {
                // color.g += 0.5;
                // let width = (aabb.z - aabb.x) * 1024; // cullData.depthPyramidSize.x;
                // let height = (aabb.w - aabb.y) * 1024; // cullData.depthPyramidSize.y;

                // // let level = u32(ceil(log2(max(width, height))));
                // let level = u32(floor(log2(max(width, height))));

                // let depth = textureSampleLevel(depthTexture, textureSampler, (aabb.xy + aabb.zw) * 0.5, level);
                // let depthSphere = zNear / (center.z - radius);

                // let visible = depthSphere + 1.0 < depth;
                
                // let size = aabb.w;
                // var U = (uv - aabb.xy) * 64.0 * aabb.z;

                // l = 0; C(_V); C(_I); C(_S); C(_I); C(_B); C(_L); C(_E); C(_SPACE); F(f32(visible), 0);
                // color.r += print(U);

                // U.y -= 1.0;
                // l = 0; C(_A); C(_A); C(_B); C(_B); C(_DOT); C(_X); C(_SPACE); F(f32(aabb.x), 2);
                // color.r += print(U);

                // U.y -= 1.0;
                // l = 0; C(_A); C(_A); C(_B); C(_B); C(_DOT); C(_Y); C(_SPACE); F(f32(aabb.y), 2);
                // color.r += print(U);

                // U.y -= 1.0;
                // l = 0; C(_A); C(_A); C(_B); C(_B); C(_DOT); C(_Z); C(_SPACE); F(f32(aabb.z), 2);
                // color.r += print(U);

                // U.y -= 1.0;
                // l = 0; C(_A); C(_A); C(_B); C(_B); C(_DOT); C(_W); C(_SPACE); F(f32(aabb.w), 2);
                // color.r += print(U);

                // U.y -= 1.0;
                // l = 0; C(_D); C(_E); C(_P); C(_T); C(_H); C(_S); C(_SPACE); F(f32(depthSphere), 2);
                // color.r += print(U);
            }
            return color;
        }

        fn isVisibleV2(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            let bboxMin = (cullData.viewMatrix * vec4(meshlet.bboxMin.xyz + mesh.position.xyz, 1.0)).xyz;
            let bboxMax = (cullData.viewMatrix * vec4(meshlet.bboxMax.xyz + mesh.position.xyz, 1.0)).xyz;

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
            let RTSize = vec2f(1024, 1024);
            let MaxMipLevel = 11;

            let size = vec2((maxXY - minXY)) * RTSize.xy;
            var mip = ceil(log2(f32(max(size.x, size.y))));
     
            mip = clamp(mip, 0, f32(MaxMipLevel));



            // Texel footprint for the lower (finer-grained) level
            let level_lower = max(mip - 1, 0);
            let _scale = exp2(-level_lower);
            // let _scale = exp2(-level_lower) * 512.0;
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

            var position = boxUVs.xy;
            let width = size;
            var U = (uv - position) * 64.0 / width * 50.0;

            l = 0; C(_L); C(_E); C(_V); C(_E); C(_L); C(_SPACE); F(dims.x, 2);
            color.r += print(U);

            U.y -= 1.0;
            l = 0; C(_D); C(_E); C(_P); C(_T); C(_H); C(_SPACE); F(maxDepth, 2);
            color.r += print(U);

            let visible = minZ <= maxDepth;
            U.y -= 1.0;
            l = 0; C(_V); C(_I); C(_S); C(_I); C(_B); C(_L); C(_E); C(_SPACE); F(f32(visible), 0);
            color.r += print(U);

            return color;
        }





        const INFINITY = 1000000.0;
        // Structure to hold AABB min and max
        struct AABB {
            min: vec3f,
            max: vec3f
        };
        
        // Helper function to transform AABB corners and compute new AABB in view space
        fn transformAndComputeAABB(minCorner: vec3f, maxCorner: vec3f, modelMatrix: mat4x4<f32>, viewMatrix: mat4x4<f32>) -> AABB {
            var corners: array<vec3f, 8> = array<vec3f, 8>(
                minCorner,
                vec3f(maxCorner.x, minCorner.y, minCorner.z),
                vec3f(minCorner.x, maxCorner.y, minCorner.z),
                vec3f(maxCorner.x, maxCorner.y, minCorner.z),
                vec3f(minCorner.x, minCorner.y, maxCorner.z),
                vec3f(maxCorner.x, minCorner.y, maxCorner.z),
                vec3f(minCorner.x, maxCorner.y, maxCorner.z),
                maxCorner
            );
        
            var transformedMin = vec3f(INFINITY, INFINITY, INFINITY);
            var transformedMax = vec3f(-INFINITY, -INFINITY, -INFINITY);
        
            for (var i = 0; i < 8; i++) {
                let transformed = (viewMatrix * modelMatrix * vec4(corners[i], 1.0)).xyz;
                transformedMin = min(transformedMin, transformed);
                transformedMax = max(transformedMax, transformed);
            }
        
            var aabb: AABB;
            aabb.min = transformedMin;
            aabb.max = transformedMax;
            return aabb;
        }
        


        struct AABBV2 {
            min: vec3f,
            max: vec3f
        };
        
        /// <summary>
        /// returns the screen-space (normalized device coordinates) bounds of a projected sphere
        /// </summary>
        /// <param name="center">view-space center of the sphere</param>
        /// <param name="radius">world or view space radius of the sphere</param>
        /// <param name="boxMin">minimum (bottom left) projected bounds</param>
        /// <param name="boxMax">maximum (top right) projected bounds</param>
        fn GetProjectedBounds(projection: mat4x4<f32>, center: vec3f, radius: f32) -> AABBV2 {
            let d2 = dot(center,center);

            let a = sqrt(d2 - radius * radius);

            /// view-aligned "right" vector (right angle to the view plane from the center of the sphere. Since  "up" is always (0,n,0), replaced cross product with vec3(-c.z, 0, c.x)
            let right = (radius / a) * vec3(-center.z, 0, center.x);
            let up = vec3(0,radius,0);

            let projectedRight  = projection * vec4(right,0);
            let projectedUp     = projection * vec4(up,0);

            var projectedCenter = projection * vec4(center,1);
            projectedCenter.x *= -1.0;

            var north  = projectedCenter + projectedUp;
            var east   = projectedCenter + projectedRight;
            var south  = projectedCenter - projectedUp;
            var west   = projectedCenter - projectedRight;

            north /= north.w ;
            east  /= east.w  ;
            west  /= west.w  ;
            south /= south.w ;

            var out: AABBV2;
            out.min = min(min(min(east,west),north),south).xyz;
            out.max = max(max(max(east,west),north),south).xyz;

            return out;
        }
        
        fn isVisibleV3(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            let bounds = vec3(0.5);
            let bboxMin = (mesh.modelMatrix * vec4(-bounds, 1.0)).xyz;
            let bboxMax = (mesh.modelMatrix * vec4(bounds, 1.0)).xyz;

            let boxSize = bboxMax - bboxMin;

            let boxCorners: array<vec3f, 8> = array(
                bboxMin.xyz,
                bboxMin.xyz + vec3f(boxSize.x,0,0),
                bboxMin.xyz + vec3f(0, boxSize.y,0),
                bboxMin.xyz + vec3f(0, 0, boxSize.z),
                bboxMin.xyz + vec3f(boxSize.xy,0),
                bboxMin.xyz + vec3f(0, boxSize.yz),
                bboxMin.xyz + vec3f(boxSize.x, 0, boxSize.z),
                bboxMin.xyz + boxSize.xyz
            );

            
            // Show corners
            for (var i = 0; i < 8; i++) {
                // let i = 0;
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
                let clip = clipPos.xyz / clipPos.w;
                let ndc = clip.xy * vec2(0.5, -0.5) + 0.5;
    
                if (length(uv - ndc.xy) < 0.005) {
                    color.g += 1.0;
                }
            }

            var minXY = vec2f(INFINITY);
            var maxXY = vec2f(-INFINITY);
            var minZ = INFINITY;
    
            for (var i = 0; i < 8; i++) {
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
    
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

            // let P00 = cullData.projectionMatrix[0][0];
            // let P11 = cullData.projectionMatrix[1][1];

            // // let aabb = vec4f(minXY.x, maxXY.x, minXY.y, maxXY.y);
            var aabb = vec4(minXY.x, minXY.y, maxXY.x, maxXY.y);
            // // clip space -> uv space
            // // aabb = aabb.xwzy * vec4(0.5f, -0.5f, 0.5f, -0.5f) + vec4(0.5f);

            // let width = (aabb.z - aabb.x) * 1024; // cullData.depthPyramidSize.x;
            // let height = (aabb.w - aabb.y) * 1024; // cullData.depthPyramidSize.y;

            // // let level = u32(ceil(log2(max(width, height))));
            // let level = u32(floor(log2(max(width, height))));






            let boxUVs = vec4f(minXY, maxXY);

            // Calculate hi-Z buffer mip
            let RTSize = vec2f(1024, 1024);
            let MaxMipLevel = 10;

            let size = vec2((maxXY - minXY)) * RTSize.xy;
            var mip = ceil(log2(f32(max(size.x, size.y))));
     
            mip = clamp(mip, 0, f32(MaxMipLevel));



            // Texel footprint for the lower (finer-grained) level
            let level_lower = max(mip - 1, 0);
            let _scale = exp2(-level_lower);
            // let _scale = exp2(-level_lower) * 512.0;
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
            // let maxDepth = max(max(max(depth.x, depth.y), depth.z), depth.w);

            let maxDepth = textureSampleLevel(depthTexture, textureSampler, (aabb.xy + aabb.zw) * 0.5, u32(mip));

            var position = boxUVs.xy;
            var U = (uv - position) * 64.0 / size * 50.0;

            l = 0; C(_L); C(_E); C(_V); C(_E); C(_L); C(_SPACE); F(dims.x, 2);
            color.r += print(U);

            U.y -= 1.0;
            l = 0; C(_D); C(_E); C(_P); C(_T); C(_H); C(_SPACE); F(maxDepth, 2);
            color.r += print(U);

            let visible = minZ <= maxDepth;
            U.y -= 1.0;
            l = 0; C(_V); C(_I); C(_S); C(_I); C(_B); C(_L); C(_E); C(_SPACE); F(f32(visible), 0);
            color.r += print(U);



            
            return color;
        }

        fn isVisibleV4(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            let m = cullData.projectionMatrix;
            let P00 = m[0][0];
            let P11 = m[1][1];
            let zNear = m[3][2];

            let scale = mesh.scale.x;
            let boundingSphere = meshlet.boundingSphere * scale;
            let center = (cullData.viewMatrix * vec4(mesh.position.xyz, 1.0)).xyz;
            let radius = boundingSphere.w * 0.5;

            let projected = projectSphere(center, radius, zNear, P00, P11);
            // let projected = projectSphere2(center, radius, m);

            let aabb = projected.aabb;

            if (projected.ret) {
                if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {
                // if (uv.x >= aabb.x) {
                    // color.g += 0.2;


                    let width = (aabb.z - aabb.x) * 1024; // cullData.depthPyramidSize.x;
                    let height = (aabb.w - aabb.y) * 1024; // cullData.depthPyramidSize.y;
    
                    // let level = u32(ceil(log2(max(width, height))));
                    let level = u32(floor(log2(max(width, height))));
    
                    let c = (aabb.xy + aabb.zw) * 0.5;
                    // let depth = textureSampleLevel(depthTexture, textureSampler, (aabb.xy + aabb.zw) * 0.5, level);
                    //load depths from high z buffer
                    let texelSize = 1.0 / vec2f(textureDimensions(depthTexture, level)); // Get texel size at this LOD
                    let depth = vec4f(
                        textureSampleLevel(depthTexture, textureSampler, c + vec2(-texelSize.x, -texelSize.y), level),
                        textureSampleLevel(depthTexture, textureSampler, c + vec2(texelSize.x, -texelSize.y), level),
                        textureSampleLevel(depthTexture, textureSampler, c + vec2(-texelSize.x, texelSize.y), level),
                        textureSampleLevel(depthTexture, textureSampler, c + vec2(texelSize.x, texelSize.y), level)
                    );
        
                    //find the max depth
                    let maxDepth = max(max(max(depth.x, depth.y), depth.z), depth.w);

                    let depthSphere = zNear / (center.z - radius);
                    let visible = depthSphere + 1.0 <= maxDepth;

                    var U = (uv - aabb.xy) * 75.0;
    
                    l = 0; C(_V); C(_I); C(_S); C(_I); C(_B); C(_L); C(_E); C(_SPACE); F(f32(visible), 0);
                    color.r += print(U);

                    U.y -= 1.0;
                    l = 0; C(_D); C(_E); C(_P); C(_T); C(_H); C(_SPACE); F(f32(maxDepth), 2);
                    color.r += print(U);
    
                    U.y -= 1.0;
                    l = 0; C(_D); C(_E); C(_P); C(_T); C(_H); C(_S); C(_SPACE); F(f32(depthSphere), 2);
                    color.r += print(U);
                }
            }
            



            
            return color;
        }


        fn isVisibleV5(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            let bounds = vec3(0.5);
            let bboxMin = (mesh.modelMatrix * vec4(-bounds, 1.0)).xyz;
            let bboxMax = (mesh.modelMatrix * vec4(bounds, 1.0)).xyz;

            let boxSize = bboxMax - bboxMin;

            let boxCorners: array<vec3f, 8> = array(
                bboxMin.xyz,
                bboxMin.xyz + vec3f(boxSize.x,0,0),
                bboxMin.xyz + vec3f(0, boxSize.y,0),
                bboxMin.xyz + vec3f(0, 0, boxSize.z),
                bboxMin.xyz + vec3f(boxSize.xy,0),
                bboxMin.xyz + vec3f(0, boxSize.yz),
                bboxMin.xyz + vec3f(boxSize.x, 0, boxSize.z),
                bboxMin.xyz + boxSize.xyz
            );

            
            // Show corners
            for (var i = 0; i < 8; i++) {
                // let i = 0;
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
                let clip = clipPos.xyz / clipPos.w;
                let ndc = clip.xy * vec2(0.5, -0.5) + 0.5;
    
                if (length(uv - ndc.xy) < 0.005) {
                    color.g += 1.0;
                }
            }

            var minXY = vec2f(INFINITY);
            var maxXY = vec2f(-INFINITY);
            var minZ = INFINITY;
    
            for (var i = 0; i < 8; i++) {
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
    
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


            var aabb = vec4(minXY.x, minXY.y, maxXY.x, maxXY.y);

            if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {

                let boxUVs = vec4f(minXY, maxXY);
            
                // Calculate hi-Z buffer mip
                let RTSize = vec2f(1024, 1024);
                let MaxMipLevel = 11;

                let size = vec2((maxXY - minXY)) * RTSize.xy;
                var mip = ceil(log2(f32(max(size.x, size.y))));
            
                mip = clamp(mip, 0, f32(MaxMipLevel));



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

                let visible = minZ <= maxDepth;

                if (!visible) {
                    color.g += 0.2;
                }
                // return minZ <= maxDepth;
            }

            return color;
        }


        fn isVisibleV6(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            let bounds = vec3(0.5);
            let bboxMin = (mesh.modelMatrix * vec4(-bounds, 1.0)).xyz;
            let bboxMax = (mesh.modelMatrix * vec4(bounds, 1.0)).xyz;

            let boxSize = bboxMax - bboxMin;

            let boxCorners: array<vec3f, 8> = array(
                bboxMin.xyz,
                bboxMin.xyz + vec3f(boxSize.x,0,0),
                bboxMin.xyz + vec3f(0, boxSize.y,0),
                bboxMin.xyz + vec3f(0, 0, boxSize.z),
                bboxMin.xyz + vec3f(boxSize.xy,0),
                bboxMin.xyz + vec3f(0, boxSize.yz),
                bboxMin.xyz + vec3f(boxSize.x, 0, boxSize.z),
                bboxMin.xyz + boxSize.xyz
            );

            
            // Show corners
            for (var i = 0; i < 8; i++) {
                // let i = 0;
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
                let clip = clipPos.xyz / clipPos.w;
                let ndc = clip.xy * vec2(0.5, -0.5) + 0.5;
    
                if (length(uv - ndc.xy) < 0.005) {
                    color.g += 1.0;
                }
            }

            var minXY = vec2f(INFINITY);
            var maxXY = vec2f(-INFINITY);
            var minZ = INFINITY;
    
            for (var i = 0; i < 8; i++) {
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
    
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


            let m = cullData.projectionMatrix;
            let P00 = m[0][0];
            let P11 = m[1][1];
            let zNear = m[3][2];

            let scale = mesh.scale.x;
            let boundingSphere = meshlet.boundingSphere * scale;
            let center = (cullData.viewMatrix * mesh.modelMatrix * vec4(vec3(0), 1.0)).xyz;
            let radius = boundingSphere.w * 0.5;

            let projected = projectSphere(center, radius, zNear, P00, P11);
            
            var aabb = projected.aabb;

            if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {
                
                let boxUVs = vec4f(minXY, maxXY);
            
                // Calculate hi-Z buffer mip
                let MaxMipLevel = 11;
                let width = (aabb.z - aabb.x) * 1024; // cullData.depthPyramidSize.x;
                let height = (aabb.w - aabb.y) * 1024; // cullData.depthPyramidSize.y;
                // mip = ceil(log2(max(width, height)));
                var mip = f32(floor(log2(max(width, height))));
                mip = clamp(mip, 0, f32(MaxMipLevel));




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

                let visible = minZ <= maxDepth;

                if (!visible) {
                    color.g += 0.2;
                }
                // return minZ <= maxDepth;
            }

            return color;
        }

        fn isVisibleV7(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];


            let bounds = vec3(0.5);
            let bboxMin = (mesh.modelMatrix * vec4(-bounds, 1.0)).xyz;
            let bboxMax = (mesh.modelMatrix * vec4(bounds, 1.0)).xyz;

            let boxSize = bboxMax - bboxMin;

            let boxCorners: array<vec3f, 8> = array(
                bboxMin.xyz,
                bboxMin.xyz + vec3f(boxSize.x,0,0),
                bboxMin.xyz + vec3f(0, boxSize.y,0),
                bboxMin.xyz + vec3f(0, 0, boxSize.z),
                bboxMin.xyz + vec3f(boxSize.xy,0),
                bboxMin.xyz + vec3f(0, boxSize.yz),
                bboxMin.xyz + vec3f(boxSize.x, 0, boxSize.z),
                bboxMin.xyz + boxSize.xyz
            );

            
            // Show corners
            for (var i = 0; i < 8; i++) {
                // let i = 0;
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
                let clip = clipPos.xyz / clipPos.w;
                let ndc = clip.xy * vec2(0.5, -0.5) + 0.5;
    
                if (length(uv - ndc.xy) < 0.005) {
                    color.g += 1.0;
                }
            }

            
            var minXY = vec2f(INFINITY);
            var maxXY = vec2f(-INFINITY);
            var minZ = INFINITY;
    
            for (var i = 0; i < 8; i++) {
                var clipPos = cullData.projectionMatrix * cullData.viewMatrix * vec4f(boxCorners[i], 1);
    
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


            var aabb = vec4(minXY.x, minXY.y, maxXY.x, maxXY.y);


            if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {
                color.b += 0.2;
            }


            let _vCorner0NDC = aabb.zy; // Top right vCorner0NDC
            let _vCorner1NDC = aabb.xy; // Top left vCorner1NDC
            let _vCorner2NDC = aabb.zw; // Bottom right vCorner3NDC
            let _vCorner3NDC = aabb.xw; // Bottom left vCorner2NDC
            if (length(uv - aabb.xy) < 0.005) {
                // color.r += 0.2;
            }

            if (length(uv - aabb.zw) < 0.005) {
                // color.r += 0.2;
            }

            if (length(uv - aabb.xw) < 0.005) {
                // color.r += 0.2;
            }

            if (length(uv - _vCorner3NDC) < 0.005) {
                // color.r += 0.2;
            }

            let View = cullData.viewMatrix;
            let Projection = cullData.projectionMatrix;
            let ViewProjection = Projection * View;
            let ViewportSize = cullData.screenSize.xy;

            // Bounding sphere center (XYZ) and radius (W), world space
            // var Bounds = meshlet.boundingSphere;
            var Bounds = (mesh.modelMatrix * vec4f(meshlet.boundingSphere.xyz, 1.0));
            Bounds.w = meshlet.boundingSphere.w * 0.5;
            
            let vCorner0NDC = _vCorner0NDC;
            let vCorner1NDC = _vCorner1NDC;
            let vCorner2NDC = _vCorner2NDC;
            let vCorner3NDC = _vCorner3NDC;

            if (length(uv - vCorner0NDC) < 0.005) {
                color.g += 0.2;
            }
            if (length(uv - vCorner1NDC) < 0.005) {
                color.g += 0.2;
            }
            if (length(uv - vCorner2NDC) < 0.005) {
                color.g += 0.2;
            }
            if (length(uv - vCorner3NDC) < 0.005) {
                color.r += 0.2;
            }

            // In order to have the sphere covering at most 4 texels, we need to use
            // the entire width of the rectangle, instead of only the radius of the rectangle,
            // which was the original implementation in the ATI paper, it had some edge case
            // failures I observed from being overly conservative.
            let fSphereWidthNDC = distance( vCorner0NDC, vCorner1NDC );
     
            // Compute the center of the bounding sphere in screen space
            let Cv = (View * vec4f( Bounds.xyz, 1 )).xyz;
     
            // compute nearest point to camera on sphere, and project it
            let Pv = Cv - normalize( Cv ) * Bounds.w;
            let ClosestSpherePoint = Projection * vec4f( Pv, 1 );

            // Choose a MIP level in the HiZ map.
            // The original assumed viewport width > height, however I've changed it
            // to determine the greater of the two.
            //
            // This will result in a mip level where the object takes up at most
            // 2x2 texels such that the 4 sampled points have depths to compare
            // against.
            let W = fSphereWidthNDC * max(ViewportSize.x, ViewportSize.y);
            let fLOD = ceil(log2( W ));

            // fetch depth samples at the corners of the square to compare against
            var vSamples: vec4f = vec4f(0);
            vSamples.x = textureSampleLevel(depthTexture, textureSampler, vCorner0NDC, u32(fLOD));
            vSamples.y = textureSampleLevel(depthTexture, textureSampler, vCorner1NDC, u32(fLOD));
            vSamples.z = textureSampleLevel(depthTexture, textureSampler, vCorner2NDC, u32(fLOD));
            vSamples.w = textureSampleLevel(depthTexture, textureSampler, vCorner3NDC, u32(fLOD));

            let fMaxSampledDepth = max( max( vSamples.x, vSamples.y ), max( vSamples.z, vSamples.w ) );
            let fSphereDepth = (ClosestSpherePoint.z / ClosestSpherePoint.w);
     
            // cull sphere if the depth is greater than the largest of our HiZ map values
            let visible = fSphereDepth > fMaxSampledDepth;

            if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {
                if (visible) {
                    color.r += 0.2;
                }
            }

            return color;
        }

        fn isVisibleV8(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            let bounds = vec3(0.5);
            let bboxMin = (mesh.modelMatrix * vec4(-bounds, 1.0)).xyz;
            let bboxMax = (mesh.modelMatrix * vec4(bounds, 1.0)).xyz;

            return color;
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            var uv = input.vUv;

            var value = textureSampleLevel(texture, textureSampler, uv, 0);
            var color = value * 0.3;
            // var color = vec4f(0);

            let s = i32(arrayLength(&objectInfo));

            for (var i = 0; i < s; i++) {
                // color = isVisibleV1(uv, color, i);
                // color = isVisibleV2(uv, color, i);
                // color = isVisibleV3(uv, color, i);
                // color = isVisibleV4(uv, color, i);
                // color = isVisibleV5(uv, color, i);
                // color = isVisibleV6(uv, color, i);
                // color = isVisibleV7(uv, color, i);
                color = isVisibleV8(uv, color, i);
            }

            return color;
        }
        `;

        this.shader = Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                shadowMapTexture: {group: 0, binding: 1, type: "texture"},


                cullData: {group: 0, binding: 2, type: "storage"},
                meshletInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},

                depthTexture: {group: 0, binding: 6, type: "depthTexture"},
                fontTexture: {group: 0, binding: 7, type: "texture"},

                projectionMatrix: {group: 0, binding: 8, type: "storage"},
                viewMatrix: {group: 0, binding: 9, type: "storage"},
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);

        Texture.Load("./assets/font.png").then(fontTexture => {
            this.fontTexture = fontTexture;
        })
    }

    private pmb: Buffer;
    private vmb: Buffer;

    // execute(resources, this.colorTarget, this.cullData, this.meshInfoBuffer, this.meshletInfoBuffer, this.objectInfoBuffer
    public async execute(resources: ResourcePool, texture: RenderTexture, depthTexture: DepthTexture, cullData: Buffer, meshInfoBuffer: Buffer, meshletInfoBuffer: Buffer, objectInfoBuffer: Buffer) {

        if (!this.fontTexture) {
            return;
        }

        if (!this.pmb) {
            this.pmb = Buffer.Create(4 * 16, BufferType.STORAGE);
            this.shader.SetBuffer("projectionMatrix", this.pmb);
        }

        if (!this.vmb) {
            this.vmb = Buffer.Create(4 * 16, BufferType.STORAGE);
            this.shader.SetBuffer("viewMatrix", this.vmb);
        }

        this.shader.SetTexture("fontTexture", this.fontTexture);
        this.shader.SetTexture("shadowMapTexture", texture);


        this.shader.SetBuffer("cullData", cullData);
        this.shader.SetBuffer("meshInfo", meshInfoBuffer);
        this.shader.SetBuffer("meshletInfo", meshletInfoBuffer);
        this.shader.SetBuffer("objectInfo", objectInfoBuffer);
        this.shader.SetTexture("depthTexture", depthTexture);

        this.pmb.SetArray(Camera.mainCamera.projectionMatrix.clone().transpose().elements);
        this.vmb.SetArray(Camera.mainCamera.viewMatrix.clone().transpose().elements);

        RendererContext.BeginRenderPass("OcclusionCullingDebugger", [{clear: false}]);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}