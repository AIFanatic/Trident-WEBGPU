import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { DepthTexture, RenderTexture, Texture } from "../Texture";
import { Buffer } from "../Buffer";

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
            // let center = (cullData.viewMatrix * vec4(boundingSphere.xyz + mesh.position.xyz, 1.0)).xyz;
            let radius = boundingSphere.w * 0.5;

            let projected = projectSphere(center, radius, zNear, P00, P11);
            let aabb = projected.aabb;

            if (uv.x >= aabb.x && uv.x <= aabb.z && uv.y >= aabb.y && uv.y <= aabb.w) {
                let width = (aabb.z - aabb.x) * 1024; // cullData.depthPyramidSize.x;
                let height = (aabb.w - aabb.y) * 1024; // cullData.depthPyramidSize.y;

                // let level = u32(ceil(log2(max(width, height))));
                let level = u32(floor(log2(max(width, height))));

                let depth = textureSampleLevel(depthTexture, textureSampler, (aabb.xy + aabb.zw) * 0.5, level);
                let depthSphere = zNear / (-center.z - radius);

                let visible = depthSphere + 1.0 > depth;
                
                let size = aabb.w;
                var U = (uv - aabb.xy) * 64.0 / 50.0 * 50.0;

                // let visible = minZ <= maxDepth;
                U.y -= 1.0;
                l = 0; C(_V); C(_I); C(_S); C(_I); C(_B); C(_L); C(_E); C(_SPACE); F(f32(visible), 0);
                color.r += print(U);
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

        fn isVisibleV3(uv: vec2f, _color: vec4f, index: i32) -> vec4f {
            var color = _color;

            let objectIndex = objectInfo[index];
            let mesh = meshInfo[u32(objectIndex.meshID)];
            let meshlet = meshletInfo[u32(objectIndex.meshletID)];

            return color;
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            var value = textureSampleLevel(texture, textureSampler, uv, 0);
            var color = value * 0.3;
            // var color = vec4f(0);

            let s = i32(arrayLength(&objectInfo));

            for (var i = 0; i < s; i++) {
                // color = isVisibleV1(uv, color, i);
                color = isVisibleV2(uv, color, i);
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
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);

        Texture.Load("./assets/font.png").then(fontTexture => {
            this.fontTexture = fontTexture;
        })
    }

    // execute(resources, this.colorTarget, this.cullData, this.meshInfoBuffer, this.meshletInfoBuffer, this.objectInfoBuffer
    public async execute(resources: ResourcePool, texture: RenderTexture, depthTexture: DepthTexture, cullData: Buffer, meshInfoBuffer: Buffer, meshletInfoBuffer: Buffer, objectInfoBuffer: Buffer) {

        if (!this.fontTexture) {
            return;
        }

        this.shader.SetTexture("fontTexture", this.fontTexture);
        this.shader.SetTexture("shadowMapTexture", texture);


        this.shader.SetBuffer("cullData", cullData);
        this.shader.SetBuffer("meshInfo", meshInfoBuffer);
        this.shader.SetBuffer("meshletInfo", meshletInfoBuffer);
        this.shader.SetBuffer("objectInfo", objectInfoBuffer);
        this.shader.SetTexture("depthTexture", depthTexture);

        RendererContext.BeginRenderPass("OcclusionCullingDebugger", [{clear: false}]);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}