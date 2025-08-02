import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Renderer } from "../renderer/Renderer";
import { METIS_OPTIONS, Metis } from "../plugins/meshlets/Metis";
import { Meshoptimizer, attribute_size } from "../plugins/meshlets/Meshoptimizer";
import { MeshletMerger } from "../plugins/meshlets/utils/MeshletMerger";
import { FQMR } from "../plugins/meshlets/FQMR";
import FastQuadric from "../plugins/FastQuadric/FastQuadric";
import { loadModel } from "../plugins/GLTF2/gltf";

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InterleavedVertexAttribute } from "../Geometry";

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const webgpuCanvas = document.createElement("canvas");
    const renderer2 = Renderer.Create(webgpuCanvas, "webgpu");
    await Meshoptimizer.load();
    await FQMR.load();
    await Metis.load();



    
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    const controls = new OrbitControls(camera, renderer.domElement);

    camera.position.z = 5;

    function animate() {
        renderer.render( scene, camera );
    }
    renderer.setAnimationLoop( animate );


    const meshletToTHREEGeometry = (meshlet: Meshlet, isInterleavedInput = true) => {
        let vertices = meshlet.vertices;
        if (isInterleavedInput) {
            let vs: number[] = [];
            for (let i = 0; i < meshlet.vertices.length; i+=attribute_size) {
                vs.push(meshlet.vertices[i + 0], meshlet.vertices[i + 1], meshlet.vertices[i + 2]);
            }
            vertices = new Float32Array(vs);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(new THREE.Uint32BufferAttribute(meshlet.indices, 3));
        const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
        const m = new THREE.Mesh(geo.toNonIndexed(), material);
        return m;
    }

    const addMeshlet = (meshlet: Meshlet, x: number) => {
        const b = meshletToTHREEGeometry(meshlet);
        b.position.x += x;
        b.material.wireframe = true;
        scene.add(b);
    }



    const damagedHelmet = await loadModel("./assets/DamagedHelmet/DamagedHelmet_Face_2.gltf");

    for (const node of damagedHelmet.nodes) {
        if (node.mesh === undefined) continue;
        
        const meshId = node.mesh;
        const mesh = damagedHelmet.meshes[meshId];
        
        if (mesh === undefined) continue;
        if (!mesh.indices) continue;

        const vertices = new Float32Array(mesh.positions.buffer.data);
        const indices = new Uint32Array(mesh.indices.data);


        const pa = mesh.positions.buffer.data as Float32Array;
        const na = mesh.normals?.buffer.data as Float32Array;
        const ua = mesh.texCoord?.buffer.data as Float32Array;
        const ia = mesh.indices.data as Int16Array;
        if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
        
        const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([pa, na, ua], [3, 3, 2]);
        const interleavedVertices = interleavedBufferAttribute.array as Float32Array;

        const meshlet = new Meshlet(interleavedVertices, indices);
        console.log(meshlet)
        addMeshlet(meshlet, 0);

        const merged = MeshletMerger.merge([meshlet]);
        const cleaned = Meshoptimizer.clean(merged);
        console.log(cleaned)
        addMeshlet(cleaned, 1);

        const d = Meshoptimizer.meshopt_simplify(cleaned, 128, 100000);
        console.log(d.meshlet)
        addMeshlet(d.meshlet, 2);

        const fq = new FastQuadric();
        const d2 = fq.simplifyMeshlet(cleaned);
        console.log(d2)
        addMeshlet(d2, 3);

        // const d3 = FQMR.setSimplifyRebuilt(cleaned, 128);
        // console.log(d3)
        // addMeshlet(d3, 4);

        {
            const merged = MeshletMerger.merge([d2]);
            const cleaned = Meshoptimizer.clean(merged);
            const d4 = Meshoptimizer.meshopt_simplify(cleaned, 128, 100000);
            console.log(d4.meshlet)
            addMeshlet(d4.meshlet, 5);
        }
    }
};

Application();