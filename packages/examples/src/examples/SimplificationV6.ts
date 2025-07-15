import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Meshoptimizer, attribute_size } from '../plugins/meshlets/Meshoptimizer';
import { Meshlet } from '../plugins/meshlets/Meshlet';
import { Renderer } from '../renderer/Renderer';

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {




    let points = [
        [[449, 99], [439, 108], [429, 116], [418, 127], [406, 137], [391, 147], [374, 155], [357, 163], [338, 173], [327, 186], [316, 198], [317, 215], [319, 234], [331, 253], [344, 270], [354, 289], [362, 307], [358, 326], [353, 345], [348, 368], [342, 391], [354, 410], [367, 429], [380, 435], [432, 355], [422, 350], [409, 331], [415, 309], [418, 289], [409, 269], [399, 251], [396, 234], [407, 221], [426, 212], [441, 203], [453, 192], [464, 184], [477, 268]],

        [[449, 99], [464, 184], [477, 268], [464, 96], [477, 92], [494, 92], [510, 95], [528, 99], [545, 104], [563, 114], [582, 123], [596, 134], [614, 146], [621, 161], [632, 172], [634, 187], [641, 200], [647, 216], [650, 235], [651, 251], [653, 272], [652, 285], [648, 300], [641, 315], [632, 329], [555, 298], [565, 286], [566, 268], [565, 250], [560, 234], [555, 219], [546, 207], [530, 196], [511, 186], [495, 182], [477, 180]],

        [[380, 435], [432, 355], [477, 268], [632, 329], [555, 298], [614, 338], [599, 347], [582, 356], [566, 366], [559, 380], [549, 395], [543, 409], [538, 426], [524, 432], [513, 443], [494, 444], [477, 445], [461, 443], [443, 442], [430, 442], [414, 441], [404, 441], [391, 442], [445, 352], [461, 354], [477, 357], [494, 355], [508, 347], [514, 332], [522, 317], [535, 306]]
    ];
    let triangles = [
        [[0, 36, 1], [1, 36, 35], [35, 2, 1], [35, 3, 2], [3, 35, 34], [34, 4, 3], [4, 34, 5], [5, 34, 33], [33, 6, 5], [6, 33, 7], [7, 33, 32], [7, 32, 8], [8, 32, 9], [9, 32, 31], [31, 10, 9], [10, 31, 11], [11, 31, 30], [30, 12, 11], [12, 30, 13], [13, 30, 29], [29, 14, 13], [14, 29, 15], [15, 29, 28], [28, 16, 15], [16, 28, 17], [17, 28, 27], [27, 18, 17], [18, 27, 19], [19, 27, 26], [26, 20, 19], [20, 26, 21], [21, 26, 25], [25, 22, 21], [22, 25, 23], [23, 25, 24], [37, 35, 36], [37, 34, 35], [37, 33, 34], [37, 32, 33], [37, 31, 32], [37, 30, 31], [37, 29, 30], [37, 28, 29], [37, 27, 28], [37, 26, 27], [37, 25, 26], [37, 24, 25]],

        [[1, 0, 3], [3, 35, 1], [3, 4, 35], [35, 4, 5], [5, 34, 35], [5, 6, 34], [34, 6, 7], [7, 33, 34], [33, 7, 8], [8, 9, 33], [33, 9, 32], [32, 9, 10], [10, 11, 32], [32, 11, 31], [31, 11, 12], [12, 13, 31], [31, 13, 30], [30, 13, 14], [14, 15, 30], [30, 15, 29], [29, 15, 16], [16, 17, 29], [29, 17, 28], [28, 17, 18], [18, 19, 28], [28, 19, 27], [27, 19, 20], [20, 21, 27], [27, 21, 26], [26, 21, 22], [22, 23, 26], [26, 23, 25], [25, 23, 24], [25, 2, 26], [26, 2, 27], [27, 2, 28], [28, 2, 29], [29, 2, 30], [30, 2, 31], [31, 2, 32], [32, 2, 33], [33, 2, 34], [34, 2, 35], [35, 2, 1]],

        [[4, 3, 5], [5, 30, 4], [30, 5, 6], [6, 7, 30], [30, 7, 29], [29, 7, 8], [8, 9, 29], [29, 9, 28], [28, 9, 10], [10, 11, 28], [28, 11, 27], [27, 11, 12], [12, 13, 27], [27, 13, 26], [26, 13, 14], [14, 15, 26], [26, 15, 25], [25, 15, 16], [16, 17, 25], [25, 17, 24], [24, 17, 18], [18, 19, 24], [24, 19, 23], [23, 19, 20], [20, 21, 23], [23, 21, 1], [1, 21, 22], [22, 0, 1], [2, 4, 30], [2, 30, 29], [2, 29, 28], [2, 28, 27], [2, 27, 26], [2, 26, 25], [2, 25, 24], [2, 24, 23], [2, 23, 1]]
    ];

    function map(x, in_min, in_max, out_min, out_max) {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }

    let meshletsVertices = [];
    let maxVX = -Infinity;
    let minVX = Infinity;
    let maxVY = -Infinity;
    let minVY = Infinity;

    for (const point of points) {
        const vertices = point.flat();
        let meshletVertices = [];
        for (let i = 0; i < vertices.length; i += 2) {
            const x = map(vertices[i + 0], 316, 653, -0.5, 0.5);
            const y = map(vertices[i + 1], 92, 445, -0.5, 0.5);
            // meshletVertices.push(vertices[i + 0], vertices[i + 1], 0);
            meshletVertices.push(x, -y, 0);

            maxVX = Math.max(maxVX, vertices[i + 0]);
            maxVY = Math.max(maxVY, vertices[i + 1]);

            minVX = Math.min(minVX, vertices[i + 0]);
            minVY = Math.min(minVY, vertices[i + 1]);
        }
        meshletsVertices.push(meshletVertices);
    }
    console.log(maxVX, minVX, maxVY, minVY)
    console.log(meshletsVertices)


    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);


    function addMeshlet(vertices, indices) {
        let g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        g.setIndex(new THREE.Uint32BufferAttribute(indices, 3));
        // g = g.scale(0.01, 0.01, 0.01);

        const m = new THREE.Mesh(g);
        m.material.wireframe = true;
        m.material.color = new THREE.Color(Math.random() * 0xffffff);
        scene.add(m);
        return m;
    }

    addMeshlet(meshletsVertices[0].flat(), triangles[0].flat());
    addMeshlet(meshletsVertices[1].flat(), triangles[1].flat());
    addMeshlet(meshletsVertices[2].flat(), triangles[2].flat());

    camera.position.z = 5;

    function animate() {
        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

    await Meshoptimizer.load();



    
    const webgpuCanvas = document.createElement("canvas");
    const tridentRenderer = Renderer.Create(webgpuCanvas, "webgpu");




    function getVertexHash(vertex: number[]): string {
        return `${vertex[0].toPrecision(6)},${vertex[1].toPrecision(6)},${vertex[2].toPrecision(6)}`;
    }

    function getMeshletsSharedVertices(meshlets: Meshlet[]): string[] {
        let vertexHashToMeshletMap: Map<string, Set<number>> = new Map();

        for (let i = 0; i < meshlets.length; i++) {
            const meshlet = meshlets[i];
            for (let j = 0; j < meshlet.vertices.length; j+=attribute_size) {
                const hash = getVertexHash([meshlet.vertices[j + 0], meshlet.vertices[j + 1], meshlet.vertices[j + 2]]);
                let meshletList = vertexHashToMeshletMap.get(hash);
                if (!meshletList) meshletList = new Set();

                meshletList.add(i);
                vertexHashToMeshletMap.set(hash, meshletList);
            }
        }

        let sharedVertices: string[] = [];
        for (let [vertexHash, indices] of vertexHashToMeshletMap) {
            if (indices.size === 1) continue;
            sharedVertices.push(vertexHash)
        }
        return sharedVertices;
    }


    function getVerticesIndexFromHashes(vertices: Float32Array, attribute_size: number, hashes: string[]): Uint8Array {
        let out = new Uint8Array(vertices.length / attribute_size);

        for (let i = 0; i < vertices.length; i+=attribute_size) {
            const hash = getVertexHash([vertices[i + 0], vertices[i + 1], vertices[i + 2]]);
            if (hashes.includes(hash)) {
                // out.push(i/attribute_size);
                out[i/attribute_size] = 1;
            }
        }
        return out;
    }
    

    if (meshletsVertices.length !== triangles.length) throw Error("Not the same number of vertices and triangles");

    let meshlets: Meshlet[] = [];

    for (let i = 0; i < meshletsVertices.length; i++) {
        const meshlet = new Meshlet(new Float32Array(meshletsVertices[i].flat()), new Uint32Array(triangles[i].flat()));
        meshlets.push(meshlet);
    }

    const mmap = getMeshletsSharedVertices(meshlets);


    for (const meshlet of meshlets) {
        const sharedBorders = getVerticesIndexFromHashes(meshlet.vertices, attribute_size, mmap);
        const lockedVertices = sharedBorders.length > 0 ? new Uint8Array(sharedBorders) : null;
        const simplified = Meshoptimizer.meshopt_simplifyWithAttributes(meshlet, lockedVertices, 1, 1);
        // const simplified = Meshoptimizer.meshopt_simplify(meshlet, 1, 1);
        const ni = simplified.meshlet.indices.length / 3;
        const oi = meshlet.indices.length / 3;
        console.log(1, oi, ni, ni / oi);

        const m = addMeshlet(simplified.meshlet.vertices, simplified.meshlet.indices);
    }
};

Application();