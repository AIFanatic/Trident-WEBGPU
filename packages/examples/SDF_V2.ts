import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { RendererContext } from "../renderer/RendererContext";
import { Geometry, IndexAttribute, InterleavedVertexAttribute, VertexAttribute } from "../Geometry";
import { Compute, Shader } from "../renderer/Shader";
import { ComputeContext } from "../renderer/ComputeContext";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Debugger } from "../plugins/Debugger";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { CubeTexture, DepthTexture, RenderTexture3D, RenderTextureArray, RenderTextureStorage, RenderTextureStorage3D, RenderTextureStorageArray, RenderTextureStorageCube, Texture, Texture3D, TextureArray } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { SDFGenerator } from "../plugins/SDFGenerator";

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

interface Object3D {
    gameObject: GameObject;
    geometry: Geometry;
    shader: Shader;
};

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    // mainCameraGameObject.transform.position.set(0,0,15);
    mainCameraGameObject.transform.position.z = 5;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,0));

    const controls = new OrbitControls(canvas, camera);

    function RenderObjects(camera: Camera, objects: Object3D[], depthTexture: DepthTexture) {
        camera.Update();
        camera.transform.Update();

        for (const object of objects) {
            object.gameObject.transform.Update();
            object.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
            object.shader.SetMatrix4("viewMatrix", camera.viewMatrix);
            object.shader.SetMatrix4("modelMatrix", object.gameObject.transform.localToWorldMatrix);

            object.shader.SetMatrix4("invViewMatrix", camera.viewMatrix.clone().invert());
        }

        Renderer.BeginRenderFrame();

        RendererContext.BeginRenderPass("Forward", [{clear: true}], {target: depthTexture, clear: true}, true);
        for (const object of objects) {
            RendererContext.DrawGeometry(object.geometry, object.shader);
        }
        RendererContext.EndRenderPass();
    
        Renderer.EndRenderFrame();
    }

    async function PlaneTexture(texture: Texture, position: Vector3): Promise<Object3D> {

        const shader = await Shader.Create({
            code: `
            struct VertexInput {
                @location(0) position : vec4<f32>,
                @location(1) normal : vec4<f32>,
                @location(2) uv : vec4<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) normal : vec3<f32>,
                @location(1) uv : vec2<f32>,
                @location(2) world_pos : vec3<f32>,

                @location(3) instanceIdx : f32,

                @location(4) rayOrigin : vec3<f32>,
                @location(5) rayDir : vec3<f32>,
            };
            
            @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
    
            @group(0) @binding(3) var image: texture_3d<f32>;
            @group(0) @binding(4) var imageSampler: sampler;

            @group(0) @binding(5) var<storage, read> depth: f32;

            struct CameraInfo {
                position: vec4<f32>,
                direction: vec4<f32>,
                fov: vec4<f32>,
                aspect: vec4<f32>
            };

            @group(0) @binding(7) var<storage, read> invViewMatrix: mat4x4<f32>;
    
            struct Ray {
                origin: vec3f,
                dir: vec3f
            };
            const PI: f32 = 3.14159265359;
            fn perspectiveCamera(uv: vec2f, position: vec3f, cameraDirection: vec3f, fov: f32, aspect: f32) -> Ray {
                var st = uv * 2.0 - 1.0;
                var radian = fov * PI / 180.0;
                var h = tan(radian * 0.5);
                var w = h * aspect;
                var right = normalize(cross(cameraDirection, vec3(0.0, -1.0, 0.0)));
                var up = normalize(cross(right, cameraDirection));
                
                
                var ray: Ray;
                ray.dir = normalize(right * w * st.x + up * h * st.y - cameraDirection);
                ray.origin = position;
                return ray;
            }

            fn rayFromCamera(uv: vec2<f32>, invViewMatrix: mat4x4<f32>, projectionMatrix: mat4x4<f32>) -> Ray {
                var ray: Ray;

                let ndc = (uv * 2.0 - 1.0) * vec2f(1, -1);
                
                let dirView = normalize(vec3<f32>(
                    ndc.x / projectionMatrix[0][0],
                    ndc.y / projectionMatrix[1][1],
                   -1.0
                ));
                
                // Rotate into world space (w=0 so translation is ignored):
                let dirWorld = (invViewMatrix * vec4<f32>(dirView, 0.0)).xyz;

                // Camera origin in world space is simply the view‐matrix’s inverse * (0,0,0,1):
                let camPos = (invViewMatrix * vec4<f32>(0.0,0.0,0.0,1.0)).xyz;

                // Ray from camera through the pixel:
                ray.origin = camPos;
                ray.dir = dirWorld;

                return ray;
            }

            @vertex
            fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                var modelViewMatrix = viewMatrix * modelMatrix[instanceIdx];
                var p = input.position.xyz;
                // p.z = depth;
                // output.position = projectionMatrix * modelViewMatrix * vec4(p.xyz, 1.0);
                output.position = vec4(p, 1.0);
                
                var m = modelMatrix[instanceIdx];
                output.world_pos = (m * vec4(input.position.xyz, 1.0)).xyz;
                output.normal = (m * vec4(input.normal.xyz, 0.0f)).xyz;
                output.uv = input.uv.xy;
                output.instanceIdx = f32(instanceIdx);

                // var ray: Ray = perspectiveCamera(input.uv.xy, cameraInfo.position.xyz, cameraInfo.direction.xyz, cameraInfo.fov.x, cameraInfo.aspect.x);
                // output.rayOrigin = cameraInfo.position.xyz;
                // output.rayDir = output.world_pos.xyz - cameraInfo.position.xyz; // ray.dir;


                var ray = rayFromCamera(input.uv.xy, invViewMatrix, projectionMatrix);

                // Ray from camera through the pixel:
                output.rayOrigin = ray.origin;
                output.rayDir  = ray.dir;

                return output;
            }

            fn QuerySDFTexture2DArray(p: vec3f, index: f32) -> f32 {
                return textureSampleLevel(image, imageSampler, p + 0.5, 0).r;
            }

            fn calcNormal( pos: vec3f, index: f32 ) -> vec3f {
                var e = vec2(1.0,-1.0)*0.5773*0.05;
                return normalize( e.xyy*QuerySDFTexture2DArray( pos + e.xyy, index ) + 
                                  e.yyx*QuerySDFTexture2DArray( pos + e.yyx, index ) + 
                                  e.yxy*QuerySDFTexture2DArray( pos + e.yxy, index ) + 
                                  e.xxx*QuerySDFTexture2DArray( pos + e.xxx, index ) );
            }

            struct HitResult{
                hit: bool,
                t: f32	//hit = origin + direction * t
            };

            fn rayAABBIntersection(rayOrigin: vec3f, rayDirection: vec3f, aabbMin: vec3f, aabbMax: vec3f) -> HitResult {
                var result: HitResult;
                result.hit = false;
                result.t = 100000.0;	//will be replaced by min
            
                //search for bounding box intersection
                var intersection = 0.0;

                if (rayOrigin.x < 0.0) { intersection = aabbMin.x; }
                else { intersection = aabbMax.x; }
            
                var tx = (intersection - rayOrigin.x) / rayDirection.x;
                var planeIntersection = rayOrigin + tx * rayDirection;
                if( tx > 0.0 &&
                    planeIntersection.y >= aabbMin.y &&
                    planeIntersection.y <= aabbMax.y &&
                    planeIntersection.z >= aabbMin.z &&
                    planeIntersection.z <= aabbMax.z){
                    result.t = min(result.t, tx);
                    result.hit = true;
                }
            
                if (rayOrigin.y < 0.0) { intersection = aabbMin.y; }
                else { intersection = aabbMax.y; }

                var ty = (intersection - rayOrigin.y) / rayDirection.y;
                planeIntersection = rayOrigin + ty * rayDirection;
                if( ty > 0.0 && 
                    planeIntersection.x >= aabbMin.x &&
                    planeIntersection.x <= aabbMax.x &&
                    planeIntersection.z >= aabbMin.z &&
                    planeIntersection.z <= aabbMax.z){
                    result.t = min(result.t, ty);
                    result.hit = true;
                }
            
                if (rayOrigin.z < 0.0) { intersection = aabbMin.z; }
                else { intersection = aabbMax.z; }

                var tz = (intersection - rayOrigin.z) / rayDirection.z;
                planeIntersection = rayOrigin + tz * rayDirection;
                if( tz > 0.0 &&
                    planeIntersection.x >= aabbMin.x &&
                    planeIntersection.x <= aabbMax.x &&
                    planeIntersection.y >= aabbMin.y &&
                    planeIntersection.y <= aabbMax.y){
                    result.t = min(result.t, tz);
                    result.hit = true;
                }
                return result;
            }

            fn isPointInAABB(p: vec3f, aabbMin: vec3f, aabbMax: vec3f) -> bool {
                return 
                    p.x >= aabbMin.x &&
                    p.y >= aabbMin.y &&
                    p.z >= aabbMin.z &&
                    p.x <= aabbMax.x &&
                    p.y <= aabbMax.y &&
                    p.z <= aabbMax.z;
            }

            struct RayResult {
                dist: f32,
                hit: bool,
                normal: vec3f,
                hitCount: i32
            };

            fn RayMarchResult(ro: vec3f, rd: vec3f, index: i32, inresult: RayResult) -> RayResult {
                var result: RayResult = inresult;

                var sdfMatrix: mat4x4<f32> = modelMatrix[index];
                var localExtents: vec3f = vec3(1.0); // GetExtentsFromTexture(sdfExtents, index);
                var sdfMaxLocal = localExtents * 0.5;
                var sdfMinLocal = -sdfMaxLocal;
            
                var rayStartLocal = (sdfMatrix * vec4(ro, 1.0)).xyz;
                var rayEndLocal   = (sdfMatrix * vec4(ro + rd, 1)).xyz;
            
                var rayDirection = rayEndLocal - rayStartLocal;
                rayDirection /= length(rayDirection);
            
                var p = rayStartLocal;
            
                var hitDistanceLocal = 0.0;
            
            
                if (!isPointInAABB(p, sdfMinLocal, sdfMaxLocal)) {
                    var aabbHit: HitResult = rayAABBIntersection(p, rayDirection, sdfMinLocal, sdfMaxLocal);
            
                    if(!aabbHit.hit) {
                        return result;
                    }
                    //move sample point to intersection
                    var distanceToAABB = aabbHit.t;
                    p += rayDirection * distanceToAABB;
                    hitDistanceLocal = distanceToAABB;
                }
            
                var localToGlobalScale = 1.0 / length(sdfMatrix[0].xyz);
                var distanceThreshold = length(localExtents / 64.0) * 0.25;
            
            
                //skip object if AABB intersection is further away than current closest hit
                if(localToGlobalScale * hitDistanceLocal > result.dist) {
                    return result;
                }
            
                var localExtendsHalf = localExtents * 0.5;
                localExtendsHalf += 0.05; //bias
            
                var MAX_STEPS: i32 = 100;
                for(var i: i32 = 0; i < MAX_STEPS; i++) {
                    if (p.x > localExtendsHalf.x || p.y > localExtendsHalf.y || p.z > localExtendsHalf.z ||
                        p.x < -localExtendsHalf.x || p.y < -localExtendsHalf.y || p.z < -localExtendsHalf.z) {
                            break;
                        }
            
                    var sdfDist = QuerySDFTexture2DArray(p, f32(index));
            
                    // if (result.dist > MAX_DIST) {
                    //     break;
                    // }
            
                    if (sdfDist < distanceThreshold) {
                        result.hit = true;
                        
                        var distanceGlobal = hitDistanceLocal * localToGlobalScale;
                        if(distanceGlobal < result.dist) {
                            result.dist = hitDistanceLocal * localToGlobalScale;
                            result.hitCount = i;
            
                            result.normal = calcNormal(p, f32(index));
                        }
                        break;
                    };
            
                    p += rayDirection * abs(sdfDist);
                    hitDistanceLocal += abs(sdfDist);
                }
                
                return result;
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                var ro = input.rayOrigin;
                var rd = normalize(input.rayDir);
            
                var color = vec3f(0.0, 0.0, 0.0);
                
                var closestHit: RayResult;
                closestHit.dist = 1000000.0;
                var sdfCount = 1;
                for (var i: i32 = 0; i < i32(sdfCount); i++) {
                    closestHit = RayMarchResult(ro, rd, i, closestHit);
                }
            
                return vec4(vec3(closestHit.dist) / 6.0, 1.0);
                // return vec4(closestHit.normal, 1.0);
            }
            `,
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 0, binding: 2, type: "storage"},
                image: {group: 0, binding: 3, type: "texture"},
                imageSampler: {group: 0, binding: 4, type: "sampler-non-filterable"},
                depth: {group: 0, binding: 5, type: "storage"},
                invViewMatrix: {group: 0, binding: 7, type: "storage"},
            },
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"},
                uv: {location: 2, size: 2, type: "vec2"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            depthOutput: "depth24plus",
            cullMode: "none"
        });

        shader.SetTexture("image", texture);
        shader.SetSampler("imageSampler", TextureSampler.Create({
            magFilter: "nearest",
            minFilter: "nearest",
            mipmapFilter: "nearest",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"}
        ));
        shader.SetValue("depth", 0);
        const geometry = Geometry.Plane();

        const gameObject = new GameObject(scene);
        gameObject.transform.position.copy(position);

        return {gameObject: gameObject, geometry: Geometry.Plane(), shader: shader};
    }
    
    let previousTime: number = 0;

    const depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);
    // const texture = Texture.Create(512, 512);
    // const planeTexture = await PlaneTexture(texture, new Vector3(0,0,0));

    let objects: Object3D[] = [];
    // objects.push(planeTexture);

    

    {
        const suzanne = (await OBJLoaderIndexed.load("./assets/suzanne.obj"))[0];
        const suzanne_sdf_texture = await SDFGenerator.Generate(suzanne.geometry, new Vector3(1, 1, 1));

        const bunny = (await OBJLoaderIndexed.load("./assets/bunny.obj"))[0];
        const bunny_sdf_texture = await SDFGenerator.Generate(bunny.geometry, new Vector3(1, 1, 1));
        
        const scene_sdf_resolution = 256;
        const scene_sdf_texture = RenderTexture3D.Create(scene_sdf_resolution, scene_sdf_resolution, scene_sdf_resolution, "r32float");
        scene_sdf_texture.SetData(new Float32Array(Math.pow(scene_sdf_resolution, 3)).fill(0.01))

        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToTextureV3(
            {texture: bunny_sdf_texture, origin: [0, 0, 0]},
            {texture: scene_sdf_texture, origin: [50, 50, 50]},
            [bunny_sdf_texture.width, bunny_sdf_texture.height, bunny_sdf_texture.depth]
        );
        Renderer.EndRenderFrame();

        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToTextureV3(
            {texture: suzanne_sdf_texture, origin: [0, 0, 0]},
            {texture: scene_sdf_texture, origin: [70, 70, 70]},
            [suzanne_sdf_texture.width, suzanne_sdf_texture.height, suzanne_sdf_texture.depth]
        );
        Renderer.EndRenderFrame();

        const planeTexture = await PlaneTexture(scene_sdf_texture, new Vector3(0,0,0));
        objects.push(planeTexture)
    }

    const render = () => {

        RenderObjects(camera, objects, depthTexture);

        requestAnimationFrame(() => { render() })
    }
    render();

    // scene.Start();
};

Application();