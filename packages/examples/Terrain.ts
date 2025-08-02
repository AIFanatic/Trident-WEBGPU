import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { Material, PBRMaterial } from "../renderer/Material";
import { DirectionalLight } from "../components/Light";

import { GLTFLoad, GLTFLoader } from "../plugins/GLTF/gltf";
import { Color } from "../math/Color";
import { Mesh } from "../components/Mesh";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletMesh } from "../plugins/meshlets/MeshletMesh";
import { Component } from "../components/Component";
import { Utils } from "../utils/Utils";
import { Texture } from "../renderer/Texture";
import { InstancedMesh } from "../components/InstancedMesh";
import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";
import { ImpostorMesh } from "../plugins/Impostors/ImpostorMesh";
import { Dilator } from "../plugins/Impostors/Dilator";
import { DynamicBufferMemoryAllocator } from "../utils/MemoryAllocator";
import { SimplexNoise } from "../utils/SimplexNoise";

// GLTFLoader.Load("./assets/DamagedHelmet/DamagedHelmet.gltf");

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

class FirstPersonController extends Component {
    public camera: Camera;
    public speed = 1;
    public boostMultiplier = 10;
    public orbitSpeed = 0.01;

    private v = new Vector3();
    private keysPressed = { up: false, down: false, left: false, right: false, boost: false }
    private mouse = { deltaX: 0, deltaY: 0, left: false };

    public Start(): void {
        document.addEventListener("keydown", event => {
            if (event.key === "w") this.keysPressed.up = true;
            if (event.key === "s") this.keysPressed.down = true;
            if (event.key === "a") this.keysPressed.left = true;
            if (event.key === "d") this.keysPressed.right = true;
            if (event.key === "Shift") this.keysPressed.boost = true;
        })
        document.addEventListener("keyup", event => {
            if (event.key === "w") this.keysPressed.up = false;
            if (event.key === "s") this.keysPressed.down = false;
            if (event.key === "a") this.keysPressed.left = false;
            if (event.key === "d") this.keysPressed.right = false;
            if (event.key === "Shift") this.keysPressed.boost = false;
        })

        document.addEventListener("mousedown", event => { 
            document.body.requestPointerLock();
            this.mouse.left = true;
        });

        document.addEventListener("mouseup", event => {
            document.exitPointerLock();
            this.mouse.left = false;
        });

        document.addEventListener("mousemove", event => {
            if (this.mouse.left === false) return;

            this.mouse.deltaX += event.movementX * this.orbitSpeed;
            this.mouse.deltaY += event.movementY * this.orbitSpeed;
            this.camera.transform.rotation.fromEuler(new Vector3(this.mouse.deltaY, this.mouse.deltaX, 0));
        })
    }

    public Update(): void {
        const anyPressed = this.keysPressed.up || this.keysPressed.down || this.keysPressed.left || this.keysPressed.right;

        let speed = this.speed;
        this.v.set(0,0,0);
        if (this.keysPressed.up === true) this.v.z = 1;
        if (this.keysPressed.down === true) this.v.z = -1;
        if (this.keysPressed.right === true) this.v.x = 1;
        if (this.keysPressed.left === true) this.v.x = -1;
        if (this.keysPressed.boost === true) speed *= this.boostMultiplier;
        
        if (anyPressed) {
            this.v.applyQuaternion(this.camera.transform.rotation);
            this.camera.transform.position.add( this.v.mul( speed ) );
        }
    }
}

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);

    // const controls = new OrbitControls(canvas, camera);

    const player = new GameObject(scene);
    const firstPersonController = player.AddComponent(FirstPersonController);
    firstPersonController.camera = camera;

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 4);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);


    const n = new SimplexNoise(1337);

    const vertices: number[] = [];
    const uvs: number[] = [];

    function fbmNoise(x: number, z: number, simplex: SimplexNoise, octaves: number, lacunarity: number, gain: number): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
    
        for (let i = 0; i < octaves; i++) {
            total += simplex.noise2D(x * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
    
            amplitude *= gain;
            frequency *= lacunarity;
        }
    
        return total / maxValue; // Normalize to [-1, 1]
    }
    
    function ridgedNoise(x: number, z: number, simplex: SimplexNoise, octaves: number, lacunarity: number, gain: number): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 0.5;
        let weight = 1.0;
        let maxValue = 0;
    
        for (let i = 0; i < octaves; i++) {
            let signal = simplex.noise2D(x * frequency, z * frequency);
            signal = Math.abs(signal);
            signal = 1.0 - signal;
            signal *= signal;
            signal *= weight;
            weight = signal * gain;
    
            total += signal * amplitude;
            maxValue += amplitude;
    
            frequency *= lacunarity;
            amplitude *= gain;
        }
    
        return total / maxValue; // Normalize to [0, 1]
    }
    
    function generateTerrainHeight(x: number, z: number, simplex: SimplexNoise, params: any): number {
        // Base terrain (smooth hills and valleys)
        const baseTerrain = fbmNoise(x * params.baseScale, z * params.baseScale, simplex, params.baseOctaves, params.lacunarity, params.gain);
    
        // Mountain terrain (ridged noise)
        const mountainTerrain = ridgedNoise(x * params.mountainScale, z * params.mountainScale, simplex, params.mountainOctaves, params.lacunarity, params.gain);
    
        // Control the influence of mountains
        const mountainMask = Math.pow(mountainTerrain, params.mountainSharpness); // Adjust sharpness
    
        // Blend base terrain and mountains
        const terrainHeight = baseTerrain * params.baseHeight * (1 - mountainMask) + mountainTerrain * params.mountainHeight * mountainMask;
    
        return terrainHeight;
    }
    
    // Parameters for terrain generation
    const params = {
        baseScale: 0.005,        // Scale for base terrain (controls size of hills)
        baseOctaves: 6,          // Number of octaves for base terrain
        baseHeight: 20,          // Maximum height of base terrain
        mountainScale: 0.001,    // Scale for mountain terrain (controls size of mountains)
        mountainOctaves: 4,      // Number of octaves for mountains
        mountainHeight: 200,      // Maximum height of mountains
        mountainSharpness: 3.0,  // Controls how sharp the mountains are
        lacunarity: 2.0,         // Frequency multiplier per octave
        gain: 0.5,               // Amplitude multiplier per octave
    };

    const c = 500;
    for (let x = 0; x < c; x++) {
        for (let z = 0; z < c; z++) {
            // const height = n.noise2D(x * scale, z * scale) * amplitude;
            const height = generateTerrainHeight(x, z, n, params);

            vertices.push(x, height, z);
            uvs.push(x / (c - 1), z / (c - 1));
        }
    }

    const indices: number[] = [];
    for (let z = 0; z < c - 1; z++) {
        for (let x = 0; x < c - 1; x++) {
            const topLeft = z * c + x;
            const topRight = topLeft + 1;
            const bottomLeft = (z + 1) * c + x;
            const bottomRight = bottomLeft + 1;
    
            // First triangle
            indices.push(topLeft, bottomLeft, topRight);
            // Second triangle
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }


    // const bunny = await OBJLoaderIndexed.load("./bunny.obj");
    const bunny = await GLTFLoader.load("./assets/low_poly_tree_pack/pine.gltf");
    // const bunny = await GLTFLoader.load("./assets/quiver_tree_02/quiver_tree_02.gltf");
    // const bunny = await GLTFLoader.load("./assets/GLTFScenes/barrel.gltf");
    // console.log("bunny", bunny)
    const go = new GameObject(scene);
    // go.transform.scale.set(0.01, 0.01, 0.01);
    // // go.transform.position.z = -20;
    // const mesh = go.AddComponent(Mesh);
    // await mesh.SetGeometry(bunny[0].geometry);
    // mesh.AddMaterial(bunny[0].material);

    const bunnyImpostor = go.AddComponent(ImpostorMesh);
    await bunnyImpostor.Create(bunny);
    const m = new Material();
    m.shader = bunnyImpostor.impostorShader;

    // const impostor = new GameObject(scene);
    // // impostor.transform.position.x = -2
    // // impostor.transform.scale.set(10, 10, 10)
    // const im = impostor.AddComponent(Mesh);
    // await im.SetGeometry(bunnyImpostor.impostorGeometry);
    // im.AddMaterial(m);

    const instancedMeshGameObject = new GameObject(scene);
    const instancedMesh = instancedMeshGameObject.AddComponent(InstancedMesh);
    await instancedMesh.SetGeometry(bunnyImpostor.impostorGeometry);
    instancedMesh.AddMaterial(m);

    const mat = new Matrix4();
    const p = new Vector3();
    const r = new Quaternion();
    const s = new Vector3(1,1,1);
    // const cTrees = 2;
    // let i = 0;
    // for (let x = 0; x < cTrees; x++) {
    //     for (let z = 0; z < cTrees; z++) {
    //         p.set(x * 2, 0, z * 2);
    //         mat.compose(p, r, s);
    //         instancedMesh.SetMatrixAt(i, mat);
    //         i++;
    //     }
    // }

    let instanceIndex = 0;
    for (let i = 0; i < vertices.length; i+=3) {
        const x = vertices[i + 0];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        // if (y > 0.1 && y < 2.0) {
        //     p.set(x + Math.random(), y + Math.random() * 0.01, z + Math.random());
        //     mat.compose(p, r, s);
        //     instancedMesh.SetMatrixAt(instanceIndex, mat);
        //     instanceIndex++;
        // }
    }

    console.log("instances", instanceIndex)





    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.ComputeNormals();

    const terrainAlbedo = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_diff_2k.jpg");
    const terrainNormal = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_nor_gl_2k.jpg");
    const terrainSpec = await Texture.Load("./assets/textures/rocky_terrain_02_2k.gltf/textures/rocky_terrain_02_spec_2k.jpg");
    const material = new PBRMaterial({albedoMap: terrainAlbedo, normalMap: terrainNormal, metalnessMap: terrainSpec});
    const gameObject = new GameObject(scene);
    const mesh = gameObject.AddComponent(Mesh);
    await mesh.SetGeometry(geometry);
    mesh.AddMaterial(material);

    scene.Start();
};

Application();