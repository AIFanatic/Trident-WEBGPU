
import { Mesh } from "../components/Mesh";
import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { Shader } from "../renderer/Shader";
import { OrbitControls } from "../plugins/OrbitControls";

import GRASS from "./assets/grass.obj";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";

const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.z = 10;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.aspect = canvas.width / canvas.height;

    const controls = new OrbitControls(camera);
    controls.connect(canvas);

    const cubeVertices = new Float32Array([
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5,
        -0.5, 0.5, -0.5,
        -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,
        -0.5, 0.5, 0.5
    ]);

    const cubeIndices = new Uint32Array([
        0, 3, 2, 2, 1, 0, // Front face
        4, 5, 6, 6, 7, 4, // Back face
        0, 1, 5, 5, 4, 0, // Bottom face
        3, 7, 6, 6, 2, 3, // Top face
        0, 4, 7, 7, 3, 0, // Left face
        1, 2, 6, 6, 5, 1 // Right face
    ]);

    const geometry = new Geometry(cubeVertices, cubeIndices);
    const shader = Shader.Create(`
    struct VertexInput {
        @location(0) position : vec3<f32>,
        @location(1) normal : vec3<f32>,
    };
    
    struct VertexOutput {
        @builtin(position) Position : vec4<f32>,
        @location(0) vPos : vec3<f32>,
        @location(1) vNormal : vec3<f32>,
    };
    
    @group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;
    @group(0) @binding(2) var<storage, read> viewMatrix: mat4x4<f32>;
    @group(0) @binding(3) var<storage, read> modelMatrix: array<mat4x4<f32>>;
    
    fn rand(co: f32) -> f32 {
        return fract(sin((co + 1) * 12.9898) * 43758.5453);
    }

    fn RotateAroundYInDegrees(vertex: vec4<f32>, degrees: f32) -> vec4<f32> {
        var alpha = degrees * 3.14159 / 180.0;
        var sina = sin(alpha);
        var cosa = cos(alpha);
        var m: mat2x2<f32> = mat2x2<f32>(
            vec2<f32>(cosa, -sina),
            vec2<f32>(sina,  cosa)
        );
        var rotatedXZ = m * vertex.xz;
        return vec4<f32>(rotatedXZ.x, vertex.y, rotatedXZ.y, vertex.w);
    }

    @vertex
    fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
        var output : VertexOutput;
    
        var modelMatrixInstance = modelMatrix[instanceIdx];
        var modelViewMatrix = viewMatrix * modelMatrixInstance;
        
        var instance = f32(instanceIdx);
        var p: vec4f = vec4(input.position, 1.0);
        p.x += rand(instance) * 0.01;
        p.x += rand(instance * 121.12) * 0.01;

        p = RotateAroundYInDegrees(p, rand(instance) * 360.0);

        output.Position = projectionMatrix * modelViewMatrix * p;
        output.vPos = input.position;
        
        return output;
    }
    
    @fragment
    fn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {
    
        var g = 200.0 * fragData.vPos.y;
        return vec4(0.0, g, 0.0, 1.0);
    }
    `);

    // const meshGameObject = new GameObject(scene);
    // // meshGameObject.transform.position.z = 2;
    // const mesh = meshGameObject.AddComponent(Mesh);
    // mesh.enableGPUInstancing = true
    // mesh.SetGeometry(geometry);
    // mesh.AddShader(shader);

    OBJLoaderIndexed.load(GRASS, obj => {
        const geometry = new Geometry(obj.vertices, obj.indices);
        let lastCube;
        const n = 10;
        for (let x = 0; x < n; x++) {
            for (let z = 0; z < n; z++) {
                const meshGameObject = new GameObject(scene);
                meshGameObject.transform.position.set(x * 0.02, 0, z * 0.02);
                meshGameObject.transform.scale.set(20, 20, 20);
                const mesh = meshGameObject.AddComponent(Mesh);
                mesh.enableGPUInstancing = true;
                mesh.SetGeometry(geometry);
                mesh.AddShader(shader);
                lastCube = meshGameObject.transform;
            }
        }
    
        setTimeout(() => {
            console.log("CALLED", lastCube.position)
            lastCube.position.x = Math.random() * 30 + 30;
        }, 1000);
    
        scene.Start();
    })
}

Application();