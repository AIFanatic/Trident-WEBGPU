import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import * as non_simplifiable_0 from "./assets/non_simplifiable_0.json";
import { loadModel } from '../plugins/GLTF2/gltf';
import { Meshlet } from '../plugins/meshlets/Meshlet';
import { Meshoptimizer } from '../plugins/meshlets/Meshoptimizer';
import { MeshletGrouper } from '../plugins/meshlets/utils/MeshletGrouper';
import { Renderer } from '../renderer/Renderer';
import { Metis } from '../plugins/meshlets/Metis';
import { FQMR } from '../plugins/meshlets/FQMR';
import { MeshletCreator } from '../plugins/meshlets/utils/MeshletCreator';

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


    const meshletToTHREEGeometry = (meshlet: Meshlet) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(meshlet.vertices, 3));
        geo.setIndex(new THREE.Uint32BufferAttribute(meshlet.indices, 3));
        const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
        const m = new THREE.Mesh(geo.toNonIndexed(), material);
        return m;
    }






    const damagedHelmet = await loadModel("./assets/DamagedHelmet/DamagedHelmet.gltf");

    for (const node of damagedHelmet.nodes) {
        if (node.mesh === undefined) continue;
        
        const meshId = node.mesh;
        const mesh = damagedHelmet.meshes[meshId];
        
        if (mesh === undefined) continue;
        if (!mesh.indices) continue;

        const vertices = new Float32Array(mesh.positions.buffer.data);
        const indices = new Uint32Array(mesh.indices.data);

        // const geo = new THREE.BufferGeometry();
        // geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        // geo.setIndex(new THREE.Uint32BufferAttribute(indices, 3));
        // const material = new THREE.MeshBasicMaterial( { wireframe: true } );
        // const m = new THREE.Mesh(geo, material);
        // scene.add(m);

        const meshlet = new Meshlet(vertices, indices);
        const cleaned = Meshoptimizer.clean(meshlet);
        const parts = Math.ceil(indices.length / 3 / 128);
        console.log(indices.length / 3, parts)
        // const meshlets = MeshletGrouper.split(cleaned, parts);
        const meshlets = MeshletCreator.build(vertices, indices, 255, 128);



        for (let i = 0; i < meshlets.length; i++) {
            const threeMesh = meshletToTHREEGeometry(meshlets[i]);
            threeMesh.material.color = new THREE.Color(i / meshlets.length * 0xffffff);
            threeMesh.material.transparent = true;
            threeMesh.material.opacity = 0.2;
            // threeMesh.visible = false;
            threeMesh.geometry.computeBoundingSphere();
            // threeMesh.geometry.boundingSphere?.center
            threeMesh.position.add(threeMesh.geometry.boundingSphere.center).multiplyScalar(2);
            scene.add(threeMesh);
        }

        let visibleMesh = 0;
        document.body.addEventListener("keypress", event => {
            if (event.key === "+") {
                // scene.children[visibleMesh].visible = false;
                scene.children[visibleMesh].material.opacity = 0.2;
                visibleMesh++;
                // scene.children[visibleMesh].visible = true;
                scene.children[visibleMesh].material.opacity = 1.0;
            }
            else if (event.key === "-") {
                // scene.children[visibleMesh].visible = false;
                scene.children[visibleMesh].material.opacity = 0.2;
                visibleMesh--;
                // scene.children[visibleMesh].visible = true;
                scene.children[visibleMesh].material.opacity = 1.0;
            }
            console.log(visibleMesh)
        })



        console.log(meshlets)
        // const meshlets = MeshletCreator.build(vertices, indices, 255, 128);

        // let input = meshlets;
        // let output = meshlets;
        // let stats = {input: 0, output: 0};

        // const maxLOD = 19;
        // for (let lod = 0; lod < maxLOD; lod++) {
        //     output = step(input, ctxs[5]);
        //     stats = getStats(input, output);
        //     console.log(`LOD: ${lod}: input: [meshlets: ${input.length}, triangles: ${stats.input}] -> output: [meshlets: ${output.length}, triangles: ${stats.output}]`);
        //     input = output;
            
        //     if (stats.output >= stats.input) throw Error("Got more output triangles than input triangles");
        // }

        // // output = step(input, ctxs[5]);
        // // stats = getStats(input, output);
        // // console.log(`LOD: ${0}: input: [meshlets: ${input.length}, triangles: ${stats.input}] -> output: [meshlets: ${output.length}, triangles: ${stats.output}]`);
        // // input = output;

        // // output = step(input, ctxs[6]);
        // // stats = getStats(input, output);
        // // console.log(`LOD: ${1}: input: [meshlets: ${input.length}, triangles: ${stats.input}] -> output: [meshlets: ${output.length}, triangles: ${stats.output}]`);
        // // input = output;

        // // output = step(input, ctxs[7]);
        // // stats = getStats(input, output);
        // // console.log(`LOD: ${2}: input: [meshlets: ${input.length}, triangles: ${stats.input}] -> output: [meshlets: ${output.length}, triangles: ${stats.output}]`);
        // // input = output;
    }



    // const geo = new THREE.BufferGeometry();
    // geo.setAttribute("position", new THREE.Float32BufferAttribute(non_simplifiable_0.vertices, 3));
    // geo.setIndex(new THREE.Uint32BufferAttribute(non_simplifiable_0.indices, 3));
    // const material = new THREE.MeshBasicMaterial( { wireframe: true } );
    // const m = new THREE.Mesh(geo, material);
    // scene.add(m);
};

Application();