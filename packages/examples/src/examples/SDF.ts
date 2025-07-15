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

            const cameraDirection = new Vector3(
                camera.transform.localToWorldMatrix.elements[8],
                camera.transform.localToWorldMatrix.elements[9],
                camera.transform.localToWorldMatrix.elements[10]
            );
            object.shader.SetArray("cameraInfo", new Float32Array([
                ...camera.transform.position.elements, 0,
                ...cameraDirection.elements, 0,
                72, 0, 0, 0,
                canvas.width / canvas.height, 0, 0, 0
            ]));
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

            @group(0) @binding(6) var<storage, read> cameraInfo: CameraInfo;
    
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

                var ray: Ray = perspectiveCamera(input.uv.xy, cameraInfo.position.xyz, cameraInfo.direction.xyz, cameraInfo.fov.x, cameraInfo.aspect.x);

                output.rayOrigin = cameraInfo.position.xyz;
                output.rayDir = ray.dir;
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
            
                // return vec4(vec3(closestHit.dist) / 6.0, 1.0);
                return vec4(closestHit.normal, 1.0);
            }
            `,
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 0, binding: 2, type: "storage"},
                image: {group: 0, binding: 3, type: "texture"},
                imageSampler: {group: 0, binding: 4, type: "sampler-non-filterable"},
                depth: {group: 0, binding: 5, type: "storage"},
                cameraInfo: {group: 0, binding: 6, type: "storage"},
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

    async function generateSDF(geometry: Geometry, scale = new Vector3(1,1,1)): Promise<Texture> {
        const compute = await Compute.Create({
            code: `
            @group(0) @binding(0) var i_SDF: texture_storage_3d<r32float, read_write>;
            
            struct Vertex
            {
                position: vec3<f32>,
                normal: vec3<f32>,
                tex_coord: vec2<f32>
            };
    
            @group(0) @binding(1) var<storage, read> vertices: array<Vertex>;
            @group(0) @binding(2) var<storage, read> indices: array<u32>;
            @group(0) @binding(3) var<storage, read> u_GridStepSize: vec3<f32>;
            @group(0) @binding(4) var<storage, read> u_GridOrigin: vec3<f32>;
            @group(0) @binding(5) var<storage, read> u_NumTriangles: u32;
            @group(0) @binding(6) var<storage, read> u_VolumeSize: vec3<i32>;
    
            const INFINITY: f32 = 100000000.0;
    
            fn dot2_v2(v: vec2f) -> f32 { return dot(v, v); }
            fn dot2_v3(v: vec3f) -> f32 { return dot(v, v); }
            fn ndot(a: vec2f, b: vec2f) -> f32 { return a.x * b.x - a.y * b.y; }

            fn sdf_triangle(p: vec3f, a: vec3f, b: vec3f, c: vec3f) -> f32
            {
                var ba  = b - a;
                var pa  = p - a;
                var cb  = c - b;
                var pb  = p - b;
                var ac  = a - c;
                var pc  = p - c;
                var nor = cross(ba, ac);
            
                var cond = (sign(dot(cross(ba, nor), pa)) + sign(dot(cross(cb, nor), pb)) + sign(dot(cross(ac, nor), pc)) < 2.0);
    
                if (cond) {
                    return min(min(
                                dot2_v3(ba * clamp(dot(ba, pa) / dot2_v3(ba), 0.0, 1.0) - pa),
                                dot2_v3(cb * clamp(dot(cb, pb) / dot2_v3(cb), 0.0, 1.0) - pb)),
                            dot2_v3(ac * clamp(dot(ac, pc) / dot2_v3(ac), 0.0, 1.0) - pc));
                }
                else {
                    return dot(nor, pa) * dot(nor, pa) / dot2_v3(nor);
                }
            }
            
            fn is_front_facing(p: vec3f, v0: Vertex, v1: Vertex, v2: Vertex) -> bool
            {
                return dot(normalize(p - v0.position.xyz), v0.normal.xyz) >= 0.0f || dot(normalize(p - v1.position.xyz), v1.normal.xyz) >= 0.0f || dot(normalize(p - v2.position.xyz), v2.normal.xyz) >= 0.0f;
            }
            
            @compute @workgroup_size(8, 8, 1)
            fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                var coord = vec3i(grid.xyz);
    
                // if (all(lessThan(coord, u_VolumeSize)))
                if (coord.x < u_VolumeSize.x && coord.y < u_VolumeSize.y && coord.z < u_VolumeSize.z)
                {
                    var p = u_GridOrigin + u_GridStepSize * vec3f(coord);
            
                    var closest_dist = INFINITY;
                    var front_facing = true;
            
                    for (var i: u32 = 0; i < u_NumTriangles; i++)
                    {
                        var v0: Vertex = vertices[indices[3 * i]];
                        var v1: Vertex = vertices[indices[3 * i + 1]];
                        var v2: Vertex = vertices[indices[3 * i + 2]];
            
                        var h = sdf_triangle(p, v0.position.xyz, v1.position.xyz, v2.position.xyz);
            
                        if (h < closest_dist)
                        {
                            closest_dist = h;
                            front_facing = is_front_facing(p, v0, v1, v2);
                        }
                    }
            
                    if (front_facing) { textureStore(i_SDF, coord, vec4(closest_dist)); }
                    else { textureStore(i_SDF, coord, vec4(-closest_dist)); }
                }
            } 
            `,
            computeEntrypoint: "main",
            uniforms: {
                i_SDF: {group: 0, binding: 0, type: "texture"},
                vertices: {group: 0, binding: 1, type: "storage"},
                indices: {group: 0, binding: 2, type: "storage"},
                
                u_GridStepSize: {group: 0, binding: 3, type: "storage"},
                u_GridOrigin: {group: 0, binding: 4, type: "storage"},
                u_NumTriangles: {group: 0, binding: 5, type: "storage"},
                u_VolumeSize: {group: 0, binding: 6, type: "storage"},
            }
        });
    
        const vertices = geometry.attributes.get("position")?.array as Float32Array;
        const normals = geometry.attributes.get("normal")?.array as Float32Array;
        const uvs = geometry.attributes.get("uv")?.array as Float32Array;
        const indices = geometry.index?.array as Uint32Array;

        if (!vertices) throw Error("Vertices not found");
        if (!normals) throw Error("Normals not found");
        if (!uvs) throw Error("UVS not found");
        if (!indices) throw Error("Indices not found");

        const padding = 8;
        const resolution = 0.025;
        const u_GridStepSize = new Vector3(resolution, resolution, resolution);
        const min_extents = geometry.boundingVolume.min.clone().mul(scale).sub(u_GridStepSize.clone().mul(padding));
        const max_extents = geometry.boundingVolume.max.clone().mul(scale).add(u_GridStepSize.clone().mul(padding));
    
        const u_GridOrigin = min_extents.clone().add(u_GridStepSize.clone().div(2));
        const box_size = max_extents.clone().sub(min_extents);
        const t = box_size.clone().div(u_GridStepSize);
        const u_VolumeSize = new Vector3(Math.ceil(t.x), Math.ceil(t.y), Math.ceil(t.z));
        const u_NumTriangles = indices.length / 3;
    
        
        console.log(u_VolumeSize)
        const i_SDF_Texture = RenderTextureStorage3D.Create(u_VolumeSize.x, u_VolumeSize.y, u_VolumeSize.z, "r32float");
        compute.SetTexture("i_SDF", i_SDF_Texture);
    
        let verticesScaled = vertices.slice();
        for (let i = 0; i < verticesScaled.length; i+=3) {
            verticesScaled[i + 0] *= scale.x;
            verticesScaled[i + 1] *= scale.y;
            verticesScaled[i + 2] *= scale.z;
        }
        const interleaved = InterleavedVertexAttribute.fromArrays([verticesScaled, normals, uvs], [3,3,2], [4,4,4]);
        const vertexBuffer = Buffer.Create(interleaved.array.length * 4, BufferType.STORAGE);
        vertexBuffer.SetArray(new Float32Array(interleaved.array));
        compute.SetBuffer("vertices", vertexBuffer);
        
        const indexBuffer = Buffer.Create(indices.length * 4, BufferType.STORAGE);
        indexBuffer.SetArray(indices);
        compute.SetBuffer("indices", indexBuffer);
    
        Renderer.BeginRenderFrame();
        ComputeContext.BeginComputePass("SDF Gen");
    
        compute.SetArray("u_GridStepSize", new Float32Array([...u_GridStepSize.elements, 0]));
        compute.SetArray("u_GridOrigin", new Float32Array([...u_GridOrigin.elements, 0]));
        compute.SetArray("u_NumTriangles", new Uint32Array([u_NumTriangles]));
        compute.SetArray("u_VolumeSize", new Uint32Array([...u_VolumeSize.elements, 0]));
    
        const NUM_THREADS_X = 8;
        const NUM_THREADS_Y = 8;
        const NUM_THREADS_Z = 1;
    
        const size_x = Math.ceil(u_VolumeSize.x / NUM_THREADS_X);
        const size_y = Math.ceil(u_VolumeSize.y / NUM_THREADS_Y);
        const size_z = Math.ceil(u_VolumeSize.z / NUM_THREADS_Z);
    
        console.log("dispatch", size_x, size_y, size_z)
        ComputeContext.Dispatch(compute, size_x, size_y, size_z);
        ComputeContext.EndComputePass();
        
        Renderer.EndRenderFrame();

        return i_SDF_Texture;
    }

    
    {
        const bunny = (await OBJLoaderIndexed.load("./assets/suzanne.obj"))[0];
        const i_SDF_Texture = await generateSDF(bunny.geometry, new Vector3(1, 1, 1));
        const fragmentSDF_Texture = RenderTexture3D.Create(i_SDF_Texture.width, i_SDF_Texture.height, i_SDF_Texture.depth, "r32float");
    
        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToTextureV3({texture: i_SDF_Texture}, {texture: fragmentSDF_Texture});
        Renderer.EndRenderFrame();
        const planeTexture = await PlaneTexture(fragmentSDF_Texture, new Vector3(0,0,0));
        // planeTexture.geometry = bunnyGeometry;
        // planeTexture.gameObject.transform.scale.set(1, 1, 1);
        objects.push(planeTexture)
    }

    {
        const bunny = (await OBJLoaderIndexed.load("./assets/bunny.obj"))[0];
        const i_SDF_Texture = await generateSDF(bunny.geometry, new Vector3(1, 1, 1));
        const fragmentSDF_Texture = RenderTexture3D.Create(i_SDF_Texture.width, i_SDF_Texture.height, i_SDF_Texture.depth, "r32float");
    
        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToTextureV3({texture: i_SDF_Texture}, {texture: fragmentSDF_Texture});
        Renderer.EndRenderFrame();
        const planeTexture = await PlaneTexture(fragmentSDF_Texture, new Vector3(5,0,0));
        // planeTexture.geometry = bunnyGeometry;
        // planeTexture.gameObject.transform.scale.set(1, 1, 1);
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