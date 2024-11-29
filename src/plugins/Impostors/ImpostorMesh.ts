import { GameObject } from "../../GameObject";
import { Geometry, InterleavedVertexAttribute, VertexAttribute } from "../../Geometry";
import { Scene } from "../../Scene";
import { Camera } from "../../components/Camera";
import { Mesh } from "../../components/Mesh";
import { Vector3 } from "../../math/Vector3";
import { Vector2 } from "../../math/Vector2";
import { Renderer } from "../../renderer/Renderer";
import { RendererContext } from "../../renderer/RendererContext";
import { Shader } from "../../renderer/Shader";
import { RenderTexture, Texture } from "../../renderer/Texture";
import { Buffer, BufferType } from "../../renderer/Buffer";
import { TextureSampler } from "../../renderer/TextureSampler";
import { Object3D } from "../../Object3D";
import { Material, PBRMaterial } from "../../renderer/Material";
import { MathUtils } from "three";
import { Matrix4 } from "../../math/Matrix4";
import { Dilator } from "./Dilator";

export class ImpostorMesh extends Mesh {
    public impostorGeometry: Geometry;
    public impostorShader: Shader;
    public albedoTexture: RenderTexture;
    public normalTexture: RenderTexture;

    public async Create(objects: Object3D[], atlasResolution = 2048, atlasTiles = 12) {
        let radius = 0;
        for (const object of objects) {
            if(object.geometry) {
                // object.geometry = object.geometry.Scale(new Vector3(0.01, 0.01, 0.01));
                object.geometry = object.geometry.Center();
                // object.geometry.ComputeBoundingVolume();
                radius = Math.max(radius, object.geometry.boundingVolume.radius);
            }
        }

        let scale = 1 / radius;
        for (const object of objects) {
            if(object.geometry) {
                object.geometry = object.geometry.Scale(new Vector3(scale, scale, scale));
                // object.geometry = object.geometry.Center();
                object.geometry.ComputeBoundingVolume();
                radius = Math.max(radius, object.geometry.boundingVolume.radius);
            }
        }

        radius = 1;
        // const radius = geometry.boundingVolume.radius * 2.0;
        // radius = 0.6478817;
        // radius *= 1.1;
        const scene = new Scene(Renderer.activeRenderer);

        console.log(radius)
        console.log("radius", radius)
        console.log("bounds min", objects[0].geometry?.boundingVolume.min);
        console.log("bounds max", objects[0].geometry?.boundingVolume.max);
        const gameObject = new GameObject(scene);
        const camera = gameObject.AddComponent(Camera);
        camera.SetOrthographic(-radius, radius, radius, -radius, 0.0, radius * 2);

        const impostorObjects: Object3D[] = [];

        for (const object of objects) {
            if (!object.geometry) continue;

            const shader = await Shader.Create({
                code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };
        
                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) vUv : vec2<f32>,
                    @location(1) vNormal : vec3<f32>,
                    @location(2) depth : f32,
                };
        
                @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
                @group(0) @binding(2) var<storage, read> renderNormal: f32;

                
                @group(0) @binding(3) var<storage, read> albedoColor: vec4<f32>;
                @group(0) @binding(4) var albedoMap: texture_2d<f32>;
                @group(0) @binding(5) var textureSampler: sampler;

                @group(0) @binding(6) var<storage, read> modelMatrix: mat4x4<f32>;
                @group(0) @binding(7) var<storage, read> cameraFar: f32;
        
                @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = projectionMatrix * viewMatrix * vec4(input.position, 1.0);
                    output.vUv = input.uv;
                    output.vNormal = input.normal;
                    var _ProjectionParams_w = 1.0 / ${radius * 2};
                    let depth = -(viewMatrix * modelMatrix * vec4(input.position, 1.0)).z / _ProjectionParams_w;

                    output.depth = depth;
                   
                    return output;
                }
                
                @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    if (renderNormal > 0.5) {
                        return vec4(vec3(input.vNormal * vec3(-1.0, 1.0, 1.0)) * 0.5 + 0.5, input.depth);
                    }
    
                    var color = albedoColor;
                    #if USE_ALBEDO_MAP
                        color = textureSample(albedoMap, textureSampler, input.vUv);
                    #endif
    
                    return color;
                }
                `,
                colorOutputs: [{format: "rgba16float"}],
                attributes: {
                    position: {location: 0, size: 3, type: "vec3"},
                    normal: {location: 1, size: 3, type: "vec3"},
                    uv: {location: 2, size: 2, type: "vec2"}
                },
                uniforms: {
                    projectionMatrix: {group: 0, binding: 0, type: "storage"},
                    viewMatrix: {group: 0, binding: 1, type: "storage"},
                    renderNormal: {group: 0, binding: 2, type: "storage"},
                    albedoColor: {group: 0, binding: 3, type: "storage"},
                    albedoMap: {group: 0, binding: 4, type: "texture"},
                    textureSampler: {group: 0, binding: 5, type: "sampler"},

                    modelMatrix: {group: 0, binding: 6, type: "storage"},
                    cameraFar: {group: 0, binding: 7, type: "storage"},
                },
                defines: {
                    USE_ALBEDO_MAP: object.material?.params.albedoMap ? true : false,
                },
            });
            shader.SetSampler("textureSampler", TextureSampler.Create());
            if (object.material) {
                if (object.material.params.albedoColor) shader.SetArray("albedoColor", object.material.params.albedoColor.elements);
                if (object.material.params.albedoMap) shader.SetTexture("albedoMap", object.material.params.albedoMap);
            }

            console.warn("Depth still has some issues")
            const m = new PBRMaterial();
            m.shader = shader;
            impostorObjects.push({material: m, geometry: object.geometry, children: [], localMatrix: null});
        }


        const frameSize = atlasResolution / atlasTiles;
        const albedoTexture = RenderTexture.Create(atlasResolution, atlasResolution, 1, "rgba16float");
        const normalTexture = RenderTexture.Create(atlasResolution, atlasResolution, 1, "rgba16float");


        const frames = atlasTiles;
        const imposterPosition = new Vector3(); // root.position + imposter.Offset

        const framesMinusOne = frames - 1;

        for (var x = 0; x < frames; x++) {
            for (var y = 0; y < frames; y++) {
                var vec = new Vector2(
                    x / framesMinusOne * 2.0 - 1.0,
                    y / framesMinusOne * 2.0 - 1.0
                );
             
                const normal = this.OctahedralCoordToVector(vec);
                const position = imposterPosition.clone().sub(normal.mul(radius).normalize());
               
                camera.transform.position.copy(position);
                camera.transform.LookAtV1(new Vector3(0, 0, -0.0000001));
                camera.transform.Update();
                camera.Update();

                for (const object of impostorObjects) {
                    if (!object.material || !object.geometry) continue;

                    object.material.shader.SetValue("renderNormal", 1);
                    this.renderByPosition(normalTexture, x * frameSize, y * frameSize, frameSize, frameSize, camera, object);
                    object.material.shader.SetValue("renderNormal", 0);
                    this.renderByPosition(albedoTexture, x * frameSize, y * frameSize, frameSize, frameSize, camera, object);
                }
            }
        }

        await this.createImpostorMesh(atlasTiles, albedoTexture, normalTexture);
        this.albedoTexture = albedoTexture;
        this.normalTexture = normalTexture;
    }
    
    private OctahedralCoordToVector(f: Vector2): Vector3 {
        function clamp( value, min, max ) {
            return Math.max( min, Math.min( max, value ) );
        }

        var n = new Vector3(f.x, 1.0 - Math.abs(f.x) - Math.abs(f.y), f.y);
        var t = clamp(-n.y, 0, 1);
        n.x += n.x >= 0.0 ? -t : t;
        n.z += n.z >= 0.0 ? -t : t;
        return n;
    }

    private renderByPosition(renderTexture: RenderTexture, x: number, y: number, w: number, h: number, camera: Camera, object: Object3D) {
        if (!object.material || !object.geometry) return;

        const modelMatrix = new Matrix4();

        object.material.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
        object.material.shader.SetMatrix4("viewMatrix", camera.viewMatrix);
        object.material.shader.SetMatrix4("modelMatrix", modelMatrix);
        object.material.shader.SetValue("cameraFar", camera.far);
        Renderer.BeginRenderFrame();
        RendererContext.BeginRenderPass("Impostor creator", [{target: renderTexture, clear: false}]);
        RendererContext.SetViewport(x, y, w, h);
        RendererContext.SetScissor(x, y, w, h);
        RendererContext.DrawGeometry(object.geometry, object.material.shader);
        RendererContext.EndRenderPass();
        Renderer.EndRenderFrame();
    }

    private async createImpostorMesh(atlasTiles: number, albedoTexture: RenderTexture, normalTexture: RenderTexture) {
        const geometry = Geometry.Plane();


        const orthoMethods = `
        // http://jcgt.org/published/0003/02/01/paper.pdf
        // A Survey of Efficient Representations for Independent Unit Vectors 
        fn sign_not_zero(v: vec2f) -> vec2f
        {
            return sign(v);
            // return vec2((v.x >= 0.f) ? 1.f : -1.f, (v.y >= 0.f) ? 1.f : -1.f);
        }

        fn VecToSphereOct(_vec: vec3f) -> vec2f {
            var vec = normalize(_vec);
            var absVec = abs(vec);
            var sum = absVec.x + absVec.y + absVec.z;
            vec /= sum;
        
            var v = vec.xz;
        
            if (vec.y < 0.0) {
                v = (1.0 - abs(v.yx)) * sign(v.xy);
            }
        
            return v;
        }

        fn OctaSphereEnc( coord: vec2f ) -> vec3f {
            var vec = vec3f(coord.x, 1.0 - abs(coord.x) - abs(coord.y), coord.y);
            if ( vec.y < 0.0 ) {
                var signVec = vec2f(sign(vec.x), sign(vec.z));
                vec.x = (1.0 - abs(vec.z)) * signVec.x;
                vec.z = (1.0 - abs(vec.x)) * signVec.y;
            }
            return vec;
        }
        `;

        const impostorShaderCommon = `
        const _ImposterOffset = vec3f(0, 0, 0);
        const _ImposterFrames = 12.0;
        const _ImposterSize = vec2f(1.0);
        const _ImposterFullSphere = true;
        const _Cutoff = 0.3;
        const _ImposterBorderClamp = 2.0;

        const textureScale = vec2f(1.0, 1.0);

        fn inverse(m: mat4x4f) -> mat4x4f {
            // let a00 = m[0][0]; let a01 = m[0][1]; let a02 = m[0][2]; let a03 = m[0][3];
            // let a10 = m[1][0]; let a11 = m[1][1]; let a12 = m[1][2]; let a13 = m[1][3];
            // let a20 = m[2][0]; let a21 = m[2][1]; let a22 = m[2][2]; let a23 = m[2][3];
            // let a30 = m[3][0]; let a31 = m[3][1]; let a32 = m[3][2]; let a33 = m[3][3];
            
            let a00 = m[0][0]; let a01 = m[1][0]; let a02 = m[2][0]; let a03 = m[3][0];
            let a10 = m[0][1]; let a11 = m[1][1]; let a12 = m[2][1]; let a13 = m[3][1];
            let a20 = m[0][2]; let a21 = m[1][2]; let a22 = m[2][2]; let a23 = m[3][2];
            let a30 = m[0][3]; let a31 = m[1][3]; let a32 = m[2][3]; let a33 = m[3][3];

            let b00 = a00 * a11 - a01 * a10;
            let b01 = a00 * a12 - a02 * a10;
            let b02 = a00 * a13 - a03 * a10;
            let b03 = a01 * a12 - a02 * a11;
            let b04 = a01 * a13 - a03 * a11;
            let b05 = a02 * a13 - a03 * a12;
            let b06 = a20 * a31 - a21 * a30;
            let b07 = a20 * a32 - a22 * a30;
            let b08 = a20 * a33 - a23 * a30;
            let b09 = a21 * a32 - a22 * a31;
            let b10 = a21 * a33 - a23 * a31;
            let b11 = a22 * a33 - a23 * a32;
            let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
            return mat4x4f(
                a11 * b11 - a12 * b10 + a13 * b09,
                a02 * b10 - a01 * b11 - a03 * b09,
                a31 * b05 - a32 * b04 + a33 * b03,
                a22 * b04 - a21 * b05 - a23 * b03,
                a12 * b08 - a10 * b11 - a13 * b07,
                a00 * b11 - a02 * b08 + a03 * b07,
                a32 * b02 - a30 * b05 - a33 * b01,
                a20 * b05 - a22 * b02 + a23 * b01,
                a10 * b10 - a11 * b08 + a13 * b06,
                a01 * b08 - a00 * b10 - a03 * b06,
                a30 * b04 - a31 * b02 + a33 * b00,
                a21 * b02 - a20 * b04 - a23 * b00,
                a11 * b07 - a10 * b09 - a12 * b06,
                a00 * b09 - a01 * b07 + a02 * b06,
                a31 * b01 - a30 * b03 - a32 * b00,
                a20 * b03 - a21 * b01 + a22 * b00) * (1 / det);
        }

        struct ImposterData
        {
            instanceIdx: u32,
            uv: vec2f,
            grid: vec2f,
            frame0: vec4f,
            frame1: vec4f,
            frame2: vec4f,
            vertex: vec4f,
            debugParam: vec4f,
        };

        struct Ray
        {
            Origin: vec3f,
            Direction: vec3f,
        };


        fn SpriteProjection( pivotToCameraRayLocal: vec3f, frames: f32, size: vec2f, coord: vec2f ) -> vec3f
        {
            var gridVec = pivotToCameraRayLocal;
            
            //octahedron vector, pivot to camera
            var y = normalize(gridVec);
            
            var x = normalize( cross( y, vec3f(0.0, 1.0, 0.0) ) );
            var z = normalize( cross( x, y ) );

            var uv = ((coord*frames)-0.5) * 2.0; //-1 to 1 

            var newX = x * uv.x;
            var newZ = z * uv.y;
            
            var floatSize = size*0.5;
            
            newX *= floatSize.x;
            newZ *= floatSize.y;
            
            var res = newX + newZ;  
            
            return res;
        }

        ${orthoMethods}

        fn VectorToGrid( vec: vec3f ) -> vec2f
        {
            return VecToSphereOct(vec);
        }

        fn TriangleInterpolate( _uv: vec2f ) -> vec4f
        {
            var uv = fract(_uv);
        
            var omuv = vec2f(1.0,1.0) - uv.xy;
            
            var res = vec4f(0,0,0,0);
            //frame 0
            res.x = min(omuv.x,omuv.y); 
            //frame 1
            res.y = abs( dot( uv, vec2(1.0,-1.0) ) );
            //frame 2
            res.z = min(uv.x,uv.y); 
            //mask
            res.w = saturate(ceil(uv.x-uv.y));
            
            return res;
        }

        fn lerp(a: vec2f, b: vec2f, t: f32) -> vec2f {
            return a + t * (b - a);
        }

        fn GridToVector( coord: vec2f ) -> vec3f
        {
            return OctaSphereEnc(coord);
        }

        //frame and framecout, returns 
        fn FrameXYToRay( frame: vec2f, frameCountMinusOne: vec2f ) -> vec3f
        {
            //divide frame x y by framecount minus one to get 0-1
            var f = frame.xy / frameCountMinusOne;
            //bias and scale to -1 to 1
            f = (f-0.5)*2.0; 
            //convert to vector, either full sphere or hemi sphere
            var vec = GridToVector( f );
            vec = normalize(vec);
            return vec;
        }

        fn ITBasis( vec: vec3f, basedX: vec3f, basedY: vec3f, basedZ: vec3f ) -> vec3f
        {
            return vec3f( dot(basedX,vec), dot(basedY,vec), dot(basedZ,vec) );
        }

        struct FrameTransformOut {
            worldX: vec3f,
            worldZ: vec3f,
            ret: vec3f
        };

        fn FrameTransform( _projRay: vec3f, frameRay: vec3f, _worldX: vec3f, _worldZ: vec3f  ) -> FrameTransformOut
        {
            var out: FrameTransformOut;

            //TODO something might be wrong here
            var worldX = normalize( vec3(-frameRay.z, 0, frameRay.x) );
            var worldZ = normalize( cross(worldX, frameRay ) ); 
            
            var projRay = _projRay * -1.0;
            
            var local = normalize( ITBasis( projRay, worldX, frameRay, worldZ ) );

            out.worldX = worldX;
            out.worldZ = worldZ;
            out.ret = local;
            return out;
        }

        fn VirtualPlaneUV( planeNormal: vec3f, planeX: vec3f, planeZ: vec3f, center: vec3f, uvScale: vec2f, rayLocal: Ray ) -> vec2f
        {
            var normalDotOrigin = dot(planeNormal,rayLocal.Origin);
            var normalDotCenter = dot(planeNormal,center);
            var normalDotRay = dot(planeNormal,rayLocal.Direction);
            
            var planeDistance = normalDotOrigin-normalDotCenter;
            planeDistance *= -1.0;
            
            var intersect = planeDistance / normalDotRay;
            
            var intersection = ((rayLocal.Direction * intersect) + rayLocal.Origin) - center;
            
            var dx = dot(planeX,intersection);
            var dz = dot(planeZ,intersection);
            
            var uv = vec2f(0,0);
            
            if ( intersect > 0.0 )
            {
                uv = vec2(dx,dz);
            }
            else
            {
                uv = vec2(0,0);
            }
            
            uv /= uvScale;
            uv += vec2(0.5,0.5);
            return uv;
        }






        fn ImposterVertex( _imp: ImposterData ) -> ImposterData
        {
            var imp = _imp;
            var _WorldSpaceCameraPos = cameraPosition.xyz;
            var unity_ObjectToWorld = modelMatrix[imp.instanceIdx];
            var unity_WorldToObject = inverse(unity_ObjectToWorld);

            //incoming vertex, object space
            var vertex = imp.vertex;
            

            var posX: f32 = unity_ObjectToWorld[3][0]; // X component of the translation
            var posY: f32 = unity_ObjectToWorld[3][1]; // Y component of the translation
            var posZ: f32 = unity_ObjectToWorld[3][2]; // Z component of the translation
            var objectPos = vec3f(posX, posY, posZ);

            var objectSpaceCameraPos = (unity_WorldToObject * vec4f(_WorldSpaceCameraPos.xyz - objectPos,1)).xyz;
            var texcoord = imp.uv;
            var objectToWorld = unity_ObjectToWorld;
            var worldToObject = unity_WorldToObject;
        
            var imposterPivotOffset = _ImposterOffset.xyz;
        
            var framesMinusOne = _ImposterFrames-1;
            
            //pivot to camera ray
            var pivotToCameraRay = normalize(objectSpaceCameraPos.xyz-imposterPivotOffset.xyz);
        
            //scale uv to single frame
            texcoord = vec2f(texcoord.x,texcoord.y)*(1.0/vec2f(_ImposterFrames, _ImposterFrames));  
            
            //radius * 2 * unity scaling
            var size = _ImposterSize.xx * 2.0; // * objectScale.xx; //unity_BillboardSize.xy                 
            
            var projected = SpriteProjection( pivotToCameraRay, _ImposterFrames, size, texcoord.xy );
        
            //this creates the proper offset for vertices to camera facing billboard
            var vertexOffset = projected + imposterPivotOffset;
            //subtract from camera pos 
            vertexOffset = normalize(objectSpaceCameraPos-vertexOffset);
            //then add the original projected world
            vertexOffset += projected;
            //remove position of vertex
            vertexOffset -= vertex.xyz;
            //add pivot
            vertexOffset += imposterPivotOffset;
        
            //camera to projection vector
            var rayDirectionLocal = (imposterPivotOffset + projected) - objectSpaceCameraPos;
                         
            //projected position to camera ray
            var projInterpolated = normalize( objectSpaceCameraPos - (projected + imposterPivotOffset) ); 
            
            var rayLocal: Ray;
            rayLocal.Origin = objectSpaceCameraPos-imposterPivotOffset; 
            rayLocal.Direction = rayDirectionLocal; 
            
            var grid = VectorToGrid( pivotToCameraRay );
            var gridRaw = grid;
            grid = saturate((grid+1.0)*0.5); //bias and scale to 0 to 1 
            grid *= framesMinusOne;
            
            var gridFrac = fract(grid);
            
            var gridFloor = floor(grid);
            
            var weights = TriangleInterpolate( gridFrac ); 
            
            //3 nearest frames
            var frame0 = gridFloor;
            var frame1 = gridFloor + lerp(vec2f(0,1),vec2f(1,0),weights.w);
            var frame2 = gridFloor + vec2f(1,1);
            
            //convert frame coordinate to octahedron direction
            var frame0ray = FrameXYToRay(frame0, vec2f(framesMinusOne));
            var frame1ray = FrameXYToRay(frame1, vec2f(framesMinusOne));
            var frame2ray = FrameXYToRay(frame2, vec2f(framesMinusOne));
            





            var planeCenter = vec3f(0,0,0);
            
            var plane0x: vec3f;
            var plane0normal = frame0ray;
            var plane0z: vec3f;
            var frame0local = FrameTransform( projInterpolated, frame0ray, plane0x, plane0z );
            plane0x = frame0local.worldX;
            plane0z = frame0local.worldZ;
            frame0local.ret.x = frame0local.ret.x/_ImposterFrames; //for displacement
            frame0local.ret.z = frame0local.ret.z/_ImposterFrames; //for displacement
            // frame0local.xz = frame0local.xz/_ImposterFrames.xx; //for displacement
            
            //virtual plane UV coordinates
            var vUv0 = VirtualPlaneUV( plane0normal, plane0x, plane0z, planeCenter, size, rayLocal );
            vUv0 /= _ImposterFrames;
            
            var plane1x: vec3f; 
            var plane1normal = frame1ray;
            var plane1z: vec3f;
            var frame1local = FrameTransform( projInterpolated, frame1ray, plane1x, plane1z);
            plane1x = frame1local.worldX;
            plane1z = frame1local.worldZ;
            frame1local.ret.x = frame1local.ret.x/_ImposterFrames; //for displacement
            frame1local.ret.z = frame1local.ret.z/_ImposterFrames; //for displacement
            // frame1local.xz = frame1local.xz/_ImposterFrames.xx; //for displacement
            
            //virtual plane UV coordinates
            var vUv1 = VirtualPlaneUV( plane1normal, plane1x, plane1z, planeCenter, size, rayLocal );
            vUv1 /= _ImposterFrames;
            
            var plane2x: vec3f;
            var plane2normal = frame2ray;
            var plane2z: vec3f;
            var frame2local = FrameTransform( projInterpolated, frame2ray, plane2x, plane2z );
            plane2x = frame2local.worldX;
            plane2z = frame2local.worldZ;
            frame2local.ret.x = frame2local.ret.x/_ImposterFrames; //for displacement
            frame2local.ret.z = frame2local.ret.z/_ImposterFrames; //for displacement
            // frame2local.xz = frame2local.xz/_ImposterFrames.xx; //for displacement
            
            //virtual plane UV coordinates
            var vUv2 = VirtualPlaneUV( plane2normal, plane2x, plane2z, planeCenter, size, rayLocal );
            vUv2 /= _ImposterFrames;
            
            //add offset here
            // imp.vertex.xyz += vertexOffset;
            imp.vertex += vec4f(vertexOffset, 0.0);
            //overwrite others
            imp.uv = texcoord;
            imp.grid = grid;
            imp.frame0 = vec4f(vUv0.xy,frame0local.ret.xz);
            imp.frame1 = vec4f(vUv1.xy,frame1local.ret.xz);
            imp.frame2 = vec4f(vUv2.xy,frame2local.ret.xz);
            imp.debugParam = vec4f(imp.frame0.zw, 0, 0);

            return imp;
        }

        fn ImposterBlendWeights( tex: texture_2d<f32>, uv: vec2f, frame0: vec2f, frame1: vec2f, frame2: vec2f, weights: vec4f, ddxy: vec2f ) -> vec4f
        {    
            // var ddx = vec2f(ddxy.x, ddxy.y);
            // var ddy = vec2f(ddxy.x, ddxy.y);

            var ddx_vp0uv = dpdx(frame0);
            var ddy_vp0uv = dpdy(frame0);
            
            var ddx_vp1uv = dpdx(frame1);
            var ddy_vp1uv = dpdy(frame1);
            
            var ddx_vp2uv = dpdx(frame2);
            var ddy_vp2uv = dpdy(frame2);

            var samp0 = textureSampleGrad( tex, textureSampler, frame0 * textureScale, ddx_vp0uv, ddy_vp0uv );
            var samp1 = textureSampleGrad( tex, textureSampler, frame1 * textureScale, ddx_vp1uv, ddy_vp1uv );
            var samp2 = textureSampleGrad( tex, textureSampler, frame2 * textureScale, ddx_vp2uv, ddy_vp2uv );

            var result = samp0*weights.x + samp1*weights.y + samp2*weights.z;
            
            return result;
        }


        struct ImpostorSamplerRet {
            baseTex: vec4f,
            worldNormal: vec4f,
            debugParam: vec4f
        };

        fn ImposterSample( imp: ImposterData) -> ImpostorSamplerRet //, out half depth )
        {
            var _ImposterBaseTex_Size = vec2f(textureDimensions(albedoTexture, 0));

            var _ImposterBaseTex_TexelSize = vec4f(
                1.0 / _ImposterBaseTex_Size.x,
                1.0 / _ImposterBaseTex_Size.y,
                _ImposterBaseTex_Size.x,
                _ImposterBaseTex_Size.y
            );

            var out: ImpostorSamplerRet;
            var fracGrid = fract(imp.grid);
            
            var weights = TriangleInterpolate( fracGrid );
              
            var gridSnap = floor(imp.grid) / vec2f(_ImposterFrames);
                
            var frame0 = gridSnap;
            var frame1 = gridSnap + (lerp(vec2f(0,1),vec2f(1,0),weights.w)/vec2f(_ImposterFrames));
            var frame2 = gridSnap + (vec2f(1,1)/vec2f(_ImposterFrames));
        
            var vp0uv = frame0 + imp.frame0.xy;
            var vp1uv = frame1 + imp.frame1.xy; 
            var vp2uv = frame2 + imp.frame2.xy;

            // //resolution of atlas (Square)
            // var textureDims = _ImposterBaseTex_TexelSize.z;
            // //fractional frame size, ex 2048/12 = 170.6
            // var frameSize = textureDims/_ImposterFrames; 
            // //actual atlas resolution used, ex 170*12 = 2040
            // var actualDims = floor(frameSize) * _ImposterFrames; 
            // //the scale factor to apply to UV coordinate, ex 2048/2040 = 0.99609375
            // var scaleFactor = actualDims / textureDims;
           
            // vp0uv *= scaleFactor;
            // vp1uv *= scaleFactor;
            // vp2uv *= scaleFactor;
           
            // //clamp out neighboring frames TODO maybe discard instead?
            // var gridSize = 1.0/vec2f(_ImposterFrames);
            // gridSize *= _ImposterBaseTex_TexelSize.zw;
            // gridSize *= _ImposterBaseTex_TexelSize.xy;
            // var border = _ImposterBaseTex_TexelSize.xy*_ImposterBorderClamp;
            
            // //vp0uv = clamp(vp0uv,frame0+border,frame0+gridSize-border);
            // //vp1uv = clamp(vp1uv,frame1+border,frame1+gridSize-border);
            // //vp2uv = clamp(vp2uv,frame2+border,frame2+gridSize-border);
           
            // //for parallax modify
            // var n0 = textureSample( normalTexture, textureSampler, vp0uv );
            // var n1 = textureSample( normalTexture, textureSampler, vp1uv );
            // var n2 = textureSample( normalTexture, textureSampler, vp2uv );
            
            // var n0s = 0.5-n0.a;    
            // var n1s = 0.5-n1.a;
            // var n2s = 0.5-n2.a;
            
            // var n0p = imp.frame0.zw * n0s;
            // var n1p = imp.frame1.zw * n1s;
            // var n2p = imp.frame2.zw * n2s;
            
            // //add parallax shift 
            // vp0uv += n0p;
            // vp1uv += n1p;
            // vp2uv += n2p;
            
            // //clamp out neighboring frames TODO maybe discard instead?
            // vp0uv = clamp(vp0uv,frame0+border,frame0+gridSize-border);
            // vp1uv = clamp(vp1uv,frame1+border,frame1+gridSize-border);
            // vp2uv = clamp(vp2uv,frame2+border,frame2+gridSize-border);
            
            var ddxy = vec2f( dpdx(imp.uv.x), dpdy(imp.uv.y) );

            var worldNormal = ImposterBlendWeights( normalTexture, imp.uv, vp0uv, vp1uv, vp2uv, weights, ddxy );
            var baseTex = ImposterBlendWeights( albedoTexture, imp.uv, vp0uv, vp1uv, vp2uv, weights, ddxy );

            out.baseTex = baseTex;
            out.worldNormal = worldNormal;
            out.debugParam = vec4f(vp1uv.xy, 0, 0);
            return out;
        }
        `
        const shader = await Shader.Create({
            code: `
            ${impostorShaderCommon}

            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32,
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
    
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vUv : vec2<f32>,
                @location(1) vNormal : vec3<f32>,
                @location(2) cameraPos_OS : vec3<f32>,

                @location(3) texCoord : vec4<f32>,
                @location(4) plane0 : vec4<f32>,
                @location(5) plane1 : vec4<f32>,
                @location(6) plane2 : vec4<f32>,
                @location(7) debugParam : vec4<f32>,
                
                @location(8) @interpolate(flat) instanceIdx : u32,
            };
    
            @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            @group(0) @binding(3) var<storage, read> cameraPosition: vec3<f32>;
            
            @group(0) @binding(4) var textureSampler: sampler;
            @group(0) @binding(5) var albedoTexture: texture_2d<f32>;
            @group(0) @binding(6) var normalTexture: texture_2d<f32>;
            @group(0) @binding(7) var<storage, read> atlasTiles: f32;
            @group(0) @binding(8) var textSDFTexture: texture_2d<f32>;

            @group(0) @binding(9) var normalTexture2: texture_2d<f32>;

            @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;

                var imp: ImposterData;
                imp.vertex = vec4(input.position.xyz, 1.0);
                imp.uv = input.uv;
                imp.instanceIdx = input.instanceIdx;

                imp = ImposterVertex(imp);
                var modelMatrixInstance = modelMatrix[input.instanceIdx];
                var modelViewMatrix = viewMatrix * modelMatrixInstance;
                output.position = projectionMatrix * modelViewMatrix * imp.vertex;
                output.vUv = input.uv;

                output.texCoord = vec4f(imp.uv, imp.grid);
                output.plane0 = imp.frame0;
                output.plane1 = imp.frame1;
                output.plane2 = imp.frame2;
                output.debugParam = imp.debugParam;
                output.instanceIdx = input.instanceIdx;

                return output;
            }
            
            struct FragmentOutput {
                @location(0) albedo : vec4f,
                @location(1) normal : vec4f,
                @location(2) RMO : vec4f,
            };

            // fn C(c) {
            //     U.x-=.5; O+= char(U,64+c)
            // }

            fn print(p: vec2<f32>, c: i32) -> f32 {
                if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
                    return 0.0;
                }
                let texCoord = p / 16.0 + fract(vec2<f32>(f32(c), 15.0 - f32(c / 16)) / 16.0);
                return textureSampleLevel(textSDFTexture, textureSampler, vec2f(texCoord.x, 1.0 - texCoord.y), 0).r;
            }

            fn print_num(pos: vec2f, n: f32, before: i32, after: i32, signed: bool) -> f32 {
                var len = before + after + i32(after > 0) + i32(signed);
                if (pos.x < 0. || pos.y < 0. || pos.x >= f32(len) || pos.y >= 1.) {
                    return 0.0;
                }
                var ind = i32(pos.x) - i32(signed);
                var char: i32;
                if (signed && ind == -1) {
                    if (n < 0.0) {
                        char = 45;
                    }
                    else {
                        char = 32;
                    }
                    // char = n < 0. ? 45 : 32; // '-' : ' '
                } else if (ind == before) {
                    char = 46; // '.'
                } else {
                    var rounded = round(abs(n) * pow(10., f32(after)));
                    var power = ind - (before + after) - i32(ind > before);
                    var dig = i32(fract(rounded * pow(10., f32(power))) * 10.);
                    char = dig + 0x30; // '0'
                }
                return print(fract(pos), char);
            }

            fn c1(input: VertexOutput) -> FragmentOutput {
                var output: FragmentOutput;

                var color0 = textureSample(normalTexture, textureSampler, input.vUv);
                var color1 = textureSample(normalTexture2, textureSampler, input.vUv);
                var color001 = vec4(0.0);
                if (input.vUv.x > 0.5) {
                    color001 = color1;
                }
                else {
                    color001 = color0;
                }

                var t = 0.0;
                if (color001.a > 0.999) {
                    t = 1.0;
                }
                output.albedo = vec4(vec3(color001.a, t, 0 ), 1.0);
                // output.albedo = vec4(vec3(color0.r, color1.r, 0), 1.0);
                output.normal = vec4(1.0);
                output.RMO = vec4(1.0);
                return output;
            }

            fn c3(input: VertexOutput) -> FragmentOutput {
                var output: FragmentOutput;
                
                var imp: ImposterData;
                //set inputs
                imp.uv = input.texCoord.xy;
                imp.grid = input.texCoord.zw;
                imp.frame0 = input.plane0;
                imp.frame1 = input.plane1;
                imp.frame2 = input.plane2;






                var out = ImposterSample(imp);
                var baseTex: vec4f = out.baseTex;
                var normalTex: vec4f = out.worldNormal;
                
                baseTex.a = saturate( pow(baseTex.a,_Cutoff) );
                if (baseTex.a <= _Cutoff) {
                    discard;
                }

                //scale world normal back to -1 to 1
                var worldNormal = normalTex.xyz*2-1;
                
                //this works but not ideal
                var unity_ObjectToWorld = modelMatrix[input.instanceIdx];
                worldNormal = (unity_ObjectToWorld * vec4f(worldNormal, 0)).xyz;




                var debugVar = out.debugParam;
                var O = 0.0;
                var uv = vec2f(imp.uv.xy);
                var position = vec2f(0);
                var FontSize = 0.2;
                var U = ( uv - position)*64.0/FontSize;

                U.x-=.5; O += print(U,64 + 8);
                U.x-=.5; O += print_num(U, debugVar.x, 2, 2, true);
                U.y-=1.0; O += print_num(U, debugVar.y, 2, 2, true);
                U.y-=1.0; O += print_num(U, debugVar.z, 2, 2, true);



                // // output.albedo = input.debugParam + 0.5;
                // // output.albedo = vec4(input.debugParam.xy, 0, 0);
                // // output.albedo = vec4(imp.frame0.xy, 0, 0);
                output.albedo = vec4(baseTex.rgb, 1.0);
                // // output.albedo = vec4(worldNormal, 1.0);
                // output.normal = vec4(worldNormal, 1.0);
                output.RMO = vec4(1.0);

                output.albedo += O;

                output.albedo = vec4(baseTex.rgb, 1.0);
                output.normal = vec4(worldNormal.xyz, 0.0);
                output.RMO = vec4(vec3(0), 0.0);

                return output;
            }

            @fragment fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                return c3(input);
            }
            `,
            colorOutputs: [{format: "rgba16float"}, {format: "rgba16float"}, {format: "rgba16float"}],
            depthOutput: "depth24plus",
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"},
                uv: {location: 2, size: 2, type: "vec2"}
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 0, binding: 2, type: "storage"},
                cameraPosition: {group: 0, binding: 3, type: "storage"},
                textureSampler: {group: 0, binding: 4, type: "sampler"},
                albedoTexture: {group: 0, binding: 5, type: "texture"},
                normalTexture: {group: 0, binding: 6, type: "texture"},
                atlasTiles: {group: 0, binding: 7, type: "storage"},

                textSDFTexture: {group: 0, binding: 8, type: "texture"},
                normalTexture2: {group: 0, binding: 9, type: "texture"},
            },
            cullMode: "none"
        });
        shader.SetSampler("textureSampler", TextureSampler.Create({magFilter: "linear", minFilter: "linear", mipmapFilter: "linear", addressModeU: "repeat", addressModeV: "repeat"}));


        const textSDFTexture = await Texture.Load("./assets/text_sdf.png");


        // const impAlbedoTexture = await Texture.Load("./assets/impostors/IMP_NO_DILATE/bunny_ImposterBase.png", Renderer.SwapChainFormat, true);
        // const impNormalTexture = await Texture.Load("./assets/impostors/IMP_NO_DILATE/bunny_ImposterPack.png", Renderer.SwapChainFormat, true);
        // impAlbedoTexture.GenerateMips();
        // impNormalTexture.GenerateMips();
        // shader.SetTexture("albedoTexture", impAlbedoTexture);
        // shader.SetTexture("normalTexture2", impNormalTexture);
        // shader.SetTexture("normalTexture", impNormalTexture);

        // albedoTexture.GenerateMips();
        // normalTexture.GenerateMips();

        // albedoTexture = await Dilator.Dilate(albedoTexture);
        // normalTexture = await Dilator.Dilate(normalTexture);
        // bunnyImpostor.normalTexture = textureDilated;
        // bunnyImpostor.impostorShader.SetTexture("normalTexture", textureDilated);
        


        const normalTextureRotated = RenderTexture.Create(normalTexture.width, normalTexture.height);
        await Texture.Blit(normalTexture, normalTextureRotated, normalTexture.width, normalTexture.height, new Vector2(-1, 1));
        normalTexture = normalTextureRotated;

        const albedoTextureRotated = RenderTexture.Create(albedoTexture.width, albedoTexture.height);
        await Texture.Blit(albedoTexture, albedoTextureRotated, albedoTexture.width, albedoTexture.height, new Vector2(-1, 1));
        albedoTexture = albedoTextureRotated;

        shader.SetTexture("textSDFTexture", textSDFTexture);

        shader.SetTexture("albedoTexture", albedoTexture);
        shader.SetTexture("normalTexture", normalTexture);
        shader.SetValue("atlasTiles", atlasTiles);

        this.impostorGeometry = geometry;
        this.impostorShader = shader;
    }
}