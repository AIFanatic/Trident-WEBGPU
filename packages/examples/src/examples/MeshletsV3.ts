import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Material, PBRMaterial, PBRMaterialParams } from "../renderer/Material";

import { Mesh } from "../components/Mesh";

import { Vector3 } from "../math/Vector3";
import { DirectionalLight, PointLight } from "../components/Light";
import { Quaternion } from "../math/Quaternion";

import { Matrix4 } from "../math/Matrix4";
import { PassParams, RenderPassOrder } from "../renderer/RenderingPipeline";

import { MeshletMesh } from "../plugins/meshlets_v2/MeshletMesh";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { OBJLoaderIndexed as OBJLoaderIndexedV2 } from "../plugins/OBJLoaderV2";
import { PostProcessingPass } from "../plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFXAA } from "../plugins/PostProcessing/effects/FXAA";
import { MeshletDraw } from "../plugins/meshlets_v2/passes/MeshletDraw";
import { DeferredGBufferPass } from "../renderer/passes/DeferredGBufferPass";

import { Color } from "../math/Color";
import { MeshletDebug } from "../plugins/meshlets_v2/passes/MeshletDebug";


import { GroupGeneratingGroups, LocalizedLodMesh, generateGroupGeneratingGroups, generateLocalizedLodMesh } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_mesh_storage";
import { Meshoptimizer } from "../plugins/meshlets_v2/nv_cluster_lod_builder/meshoptimizer/Meshoptimizer";
import { Result, Sphere, assert } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_common";
import { MeshInput, ORIGINAL_MESH_GROUP, vec3, vec4 } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_mesh";
import { Range } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvcluster";
import { GLTFParser } from "../plugins/GLTF/GLTF_Parser";
import { UIButtonStat, UIFolder, UISliderStat } from "../plugins/ui/UIStats";
import { Debugger } from "../plugins/Debugger";
import { Meshlet } from "../plugins/meshlets_v2/Meshlet";


import * as THREE from "three";
import { OrbitControls as OrbitControlsTHREE } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import { HierarchyInput } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvcluster_hierarchy";
import { LodHierarchy, generateLodHierarchy } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_hierarchy_storage";
import { mat4, mul, length, add, sub, lengthSquared, EXPECT_TRUE } from "../plugins/meshlets_v2/nv_cluster_lod_builder/test/test_common";
import { Node } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvcluster_hierarchy";
import { Vector4 } from "../math/Vector4";


const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);


function rand(co) {
    function fract(n) {
        return n % 1;
    }

    return fract(Math.sin((co + 1) * 12.9898) * 43758.5453);
}

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);



    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;

        // let objs: GameObject[] = [];
        // for (let i = 0; i < 4; i++) {
        //     const lightGameObject = new GameObject(scene);
        //     lightGameObject.transform.scale.set(0.25, 0.25, 0.25);
        //     lightGameObject.transform.position.set(Math.random() * 10 - 5, Math.random() * 10, Math.random() * 10 - 5);
        //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        //     const light = lightGameObject.AddComponent(PointLight);
        //     light.intensity = 1;
        //     light.range = 10;
        //     light.color.set(Math.random(), Math.random(), Math.random(), 1);
        //     light.castShadows = false;

        //     let lightHelperMesh = lightGameObject.AddComponent(Mesh);
        //     lightHelperMesh.SetGeometry(Geometry.Sphere());
        //     lightHelperMesh.AddMaterial(new PBRMaterial({unlit: true, albedoColor: light.color}));
        //     lightHelperMesh.enableShadows = false;

        //     objs.push(lightGameObject);
        // }

        // setInterval(() => {
        //     for (const obj of objs) {
        //         obj.transform.position.add(0.01);
        //     }
        // }, 100);

        const sphereMesh = lightGameObject.AddComponent(Mesh);
        sphereMesh.enableShadows = false;
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));

        const sunlightAngle = new Vector3(64, 64, 10);
        const lightPositionDebug = new UIFolder(Debugger.ui, "Light position");
        new UISliderStat(lightPositionDebug, "Altitude:", 0, 1000, 1, sunlightAngle.z, value => {sunlightAngle.z = value});
        new UISliderStat(lightPositionDebug, "Theta:", 0, 360, 1, sunlightAngle.x, value => {sunlightAngle.x = value});
        new UISliderStat(lightPositionDebug, "Phi:", 0, 360, 1, sunlightAngle.y, value => {sunlightAngle.y = value});
        new UIButtonStat(lightPositionDebug, "Cast shadows:", value => {light.castShadows = value}, light.castShadows);
        lightPositionDebug.Open();
        setInterval(() => {
            const theta = sunlightAngle.x * Math.PI / 180;
            const phi = sunlightAngle.y * Math.PI / 180;
            const x = Math.sin(theta) * Math.cos(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(theta);
            lightGameObject.transform.position.set(x, y, z).mul(sunlightAngle.z);
            lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        }, 100);
    }

    scene.renderPipeline.AddPass(new MeshletDraw(), RenderPassOrder.BeforeGBuffer);
    scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);
    {
        // const bunnyGeometry = await OBJLoaderIndexedV2.load("./test-assets/lucy.obj");
        // const bunnyGeometry = await OBJLoaderIndexed.load("./test-assets/DamagedHelmet/DamagedHelmet.obj");
        // const mesh = (await GLTFParser.Load("./test-assets/GLTF/namaqualand_cliff_02_2k.gltf/namaqualand_cliff_02_2k.gltf")).children[0];
        // const mesh = (await GLTFParser.Load("./test-assets/GLTF/namaqualand_boulder_03_2k.gltf/namaqualand_boulder_03_2k.gltf")).children[0];
        // const mesh = (await GLTFParser.Load("./test-assets/GLTF/horse_head_2k.gltf/horse_head_2k.gltf")).children[0];
        // const mesh = (await OBJLoaderIndexed.load("./test-assets/GLTF/horse_head_2k.gltf/horse_head.obj"))[0];
        // const mesh = (await GLTFParser.Load("./test-assets/GLTF/brass_vase_03_2k.gltf/brass_vase_03_2k.gltf")).children[0];
        // const mesh = (await GLTFParser.Load("./test-assets/GLTF/stone_fire_pit_2k.gltf/stone_fire_pit_2k.gltf")).children[0];
        // const mesh = (await GLTFParser.Load("./test-assets/GLTF/planter_box_01_2k.gltf/planter_box_01_2k.gltf")).children[0];
        // const geometry = (await OBJLoaderIndexed.load("./assets/bunny.obj"))[0];
        const geometry = (await OBJLoaderIndexed.load("./test-assets/DamagedHelmet/DamagedHelmet.obj"))[0];
        // const pinesGO = new GameObject(scene);
        // pinesGO.transform.position.set(4, 1, 0);
        // // pinesGO.transform.scale.set(10, 10, 10);
        // const instancedMesh = pinesGO.AddComponent(MeshletMesh);
        // await instancedMesh.SetGeometry(geometry.geometry);
        // // bunnyGeometry[0].material.params.wireframe = true;
        // instancedMesh.AddMaterial(geometry.material);


        


        const indices = geometry.geometry.index.array as Uint32Array;
        const vertices = geometry.geometry.attributes.get("position").array as Float32Array;
        await Meshoptimizer.load();

        const meshInput: MeshInput = new MeshInput();
        // Mesh data
        meshInput.indices = indices;
        meshInput.indexCount = indices.length;
        meshInput.vertices = vertices;
        meshInput.vertexOffset = 0;
        meshInput.vertexCount = vertices.length;
        meshInput.vertexStride = 3;
        // Use default configurations and decimation factor:
        meshInput.clusterConfig = {
            minClusterSize: 128,
            maxClusterSize: 128,
            costUnderfill: 0.9,
            costOverlap: 0.5,
            preSplitThreshold: 1 << 17,
        };
        // Cluster group configuration -- here we force groups of size 32:
        meshInput.groupConfig = {
            minClusterSize: 32,
            maxClusterSize: 32,
            costUnderfill: 0.5,
            costOverlap: 0.0,
            preSplitThreshold: 0,
        };
        // Decimation factor
        meshInput.decimationFactor = 0.5;
        
        
        let mesh: LocalizedLodMesh = new LocalizedLodMesh();
        await Meshoptimizer.load();
        let result: Result = generateLocalizedLodMesh(meshInput, mesh);

        if (result !== Result.SUCCESS) {
            throw Error("Error: " + Result[result]);
        }

        console.log(mesh)

        const hierarchyInput: HierarchyInput = new HierarchyInput()
        hierarchyInput.clusterGeneratingGroups = mesh.lodMesh.clusterGeneratingGroups;
        hierarchyInput.groupQuadricErrors = mesh.lodMesh.groupQuadricErrors;
        hierarchyInput.groupClusterRanges = mesh.lodMesh.groupClusterRanges;
        hierarchyInput.groupCount = mesh.lodMesh.groupClusterRanges.length;
        hierarchyInput.clusterBoundingSpheres = mesh.lodMesh.clusterBoundingSpheres;
        hierarchyInput.clusterCount = mesh.lodMesh.clusterBoundingSpheres.length;
        hierarchyInput.lodLevelGroupRanges = mesh.lodMesh.lodLevelGroupRanges;
        hierarchyInput.lodLevelCount = mesh.lodMesh.lodLevelGroupRanges.length;
        hierarchyInput.minQuadricErrorOverDistance = 0.001;
        hierarchyInput.conservativeBoundingSpheres = false;

        const hierarchy: LodHierarchy = new LodHierarchy();
        result = generateLodHierarchy(hierarchyInput, hierarchy);
        console.log(hierarchy)







        interface LodMesh {
            vertices: Float32Array;
            indices: Uint32Array;
            clusterIndex: number;
            parentGroupIndex: number;
            groupIndex: number;
            groupError: number;
            parentGroupError: number;
            lod: number;

            mesh: Mesh;
            threeMesh: THREE.Mesh;

            traversalMetric: TraversalMetric;
        }
        let output: LodMesh[] = [];

        // For each LOD level (highest detail first)
        for (let lod = 0; lod < mesh.lodMesh.lodLevelGroupRanges.length; lod++) {
            const lodLevelGroupRange: Range = mesh.lodMesh.lodLevelGroupRanges[lod];

            // For each group
            for (let groupIndex = lodLevelGroupRange.offset; groupIndex < lodLevelGroupRange.offset + lodLevelGroupRange.count; groupIndex++) {
                const groupClusterRange: Range = mesh.lodMesh.groupClusterRanges[groupIndex];

                // For each cluster
                for (let clusterIndex = groupClusterRange.offset; clusterIndex < groupClusterRange.offset + groupClusterRange.count; clusterIndex++) {
                    const clusterTriangleRange: Range = mesh.lodMesh.clusterTriangleRanges[clusterIndex];
                    const clusterVertexRange: Range = mesh.clusterVertexRanges[clusterIndex];

                    // Can use this to pre-compute a per-cluster vertex array
                    const clusterVertexGlobalIndices: number[] = mesh.vertexGlobalIndices.slice(clusterVertexRange.offset);

                    let clusterIndices: number[] = [];

                    // For each triangle
                    for (let triangleIndex = clusterTriangleRange.offset; triangleIndex < clusterTriangleRange.offset + clusterTriangleRange.count; triangleIndex++) {
                        const localIndex0 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 0];
                        const localIndex1 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 1];
                        const localIndex2 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 2];

                        // Map to global indices
                        const globalIndex0 = clusterVertexGlobalIndices[localIndex0];
                        const globalIndex1 = clusterVertexGlobalIndices[localIndex1];
                        const globalIndex2 = clusterVertexGlobalIndices[localIndex2];

                        clusterIndices.push(globalIndex0 + 1);
                        clusterIndices.push(globalIndex1 + 1);
                        clusterIndices.push(globalIndex2 + 1);
                    }

                    const parentGroupIndex = mesh.lodMesh.clusterGeneratingGroups[clusterIndex];



                    const geometry = new Geometry();
                    geometry.attributes.set("position", new VertexAttribute(meshInput.vertices));
                    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(meshInput.vertices.length / 3 * 2)));
                    geometry.attributes.set("normal", new VertexAttribute(new Float32Array(meshInput.vertices.length)));
                    const clusterIndicesZeroIndexed = clusterIndices.map(i => i - 1);
                    geometry.index = new IndexAttribute(new Uint32Array(clusterIndicesZeroIndexed));
        
                    const gameObject = new GameObject(scene);
                    const clusterMesh = gameObject.AddComponent(Mesh);
                    await clusterMesh.SetGeometry(geometry);
                    clusterMesh.AddMaterial(new PBRMaterial({albedoColor: Color.fromHex(rand(groupIndex + clusterIndex) * 0xffffff), unlit: true}));
                    clusterMesh.enabled = false;



                    const threeGeometry = new THREE.BufferGeometry();
                    threeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(meshInput.vertices, 3));
                    threeGeometry.index = new THREE.Uint32BufferAttribute(clusterIndicesZeroIndexed, 1);

                    const threeMat = new THREE.MeshBasicMaterial({color: rand(groupIndex + clusterIndex) * 0xffffff, wireframe: false});
                    const threeMesh = new THREE.Mesh(threeGeometry, threeMat);




                    output.push({
                        vertices: meshInput.vertices,
                        indices: new Uint32Array(clusterIndices),
                        clusterIndex: clusterIndex,
                        parentGroupIndex: parentGroupIndex,
                        groupIndex: groupIndex,
                        groupError: mesh.lodMesh.groupQuadricErrors[groupIndex],
                        parentGroupError: mesh.lodMesh.groupQuadricErrors[parentGroupIndex] || 0,
                        lod: lod,
                        mesh: clusterMesh,
                        threeMesh: threeMesh,
                        traversalMetric: {
                            boundingSphereX: hierarchy.groupCumulativeBoundingSpheres[groupIndex].x,
                            boundingSphereY: hierarchy.groupCumulativeBoundingSpheres[groupIndex].y,
                            boundingSphereZ: hierarchy.groupCumulativeBoundingSpheres[groupIndex].z,
                            boundingSphereRadius: hierarchy.groupCumulativeBoundingSpheres[groupIndex].radius,
                            maxQuadricError: hierarchy.groupCumulativeQuadricError[groupIndex],
                        }
                    });
                    
                    console.log(`Processed: lod: ${lod}, groupIndex: ${groupIndex}, clusterIndex: ${clusterIndex}, vertexCount: ${meshInput.vertices.length}, indexCount: ${clusterIndices.length}`);
                }
            }
        }

        console.log(output)

        canvas.style.display = "none";

        const threeCanvas = document.createElement("canvas");
        threeCanvas.width = window.innerWidth;
        threeCanvas.height = window.innerHeight;
        document.body.appendChild(threeCanvas);
        
        const threeRenderer = new THREE.WebGLRenderer({canvas: threeCanvas});
        const threeScene = new THREE.Scene();
        const threeCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
        threeCamera.position.z = 10;
        const threeControls = new OrbitControlsTHREE(threeCamera, threeCanvas);

        function render() {
            threeRenderer.render(threeScene, threeCamera);
        }

        setInterval(() => {
            render();
        }, 100);

        for (const o of output) {
            o.threeMesh.visible = false;
            threeScene.add(o.threeMesh);
        }


        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "20";
        slider.value = "0";
        slider.style.position = "absolute";
        slider.style.top = "20";
        slider.style.right = "20";
        document.body.appendChild(slider);

        slider.addEventListener("input", event => {
            const lod = parseInt(slider.value);

            for (const lodMesh of output) {
                lodMesh.threeMesh.visible = lod === lodMesh.lod ;
            }
        })












        function getSpherePosition(sphere: Sphere): vec3 {
            return new vec3(sphere.x, sphere.y, sphere.z);
        }

        function transformPoint(t: mat4, point: vec3): vec3 {
            let result: vec3 = new vec3(t.columns[3][0], t.columns[3][1], t.columns[3][2]);
            for (let i = 0; i < 3; i++) {
                for (let row = 0; row < 3; row++) {
                    result[row] += t.columns[i][row] * point[i];
                }
            }
            return result;
        }



        // Computes the conservative maximum arcsine of any geometric error relative to
        // the camera, where 'transform' defines a transformation to eye-space.
        function conservativeErrorOverDistance(transform: mat4, boundingSphere: Sphere, objectSpaceQuadricError: number): number {
            const radiusScale = 1.0;
            const maxError = objectSpaceQuadricError * radiusScale;
            const sphereDistance = length(transformPoint(transform, getSpherePosition(boundingSphere)));
            const errorDistance = Math.max(maxError, sphereDistance - boundingSphere.radius * radiusScale);
            return maxError / errorDistance;
        }

        function traverseChild1(viewInstanceTransform: mat4, node: Node, errorOverDistanceThreshold: number): boolean {
            return conservativeErrorOverDistance(viewInstanceTransform, node.boundingSphere, node.maxClusterQuadricError) >= errorOverDistanceThreshold;
        }

        function traverseChild2(cameraPosition: vec3, node: Node, errorOverDistanceThreshold: number): boolean {
            return traverseChild1(mat4.makeTranslation(mul(cameraPosition, -1.0)), node, errorOverDistanceThreshold);
        }

        // function traverseChild3(cameraPosition: vec3, boundingSphere: Sphere, objectSpaceQuadricError: number): boolean {
        //     return conservativeErrorOverDistance(mat4.makeTranslation(mul(cameraPosition, -1.0)), boundingSphere, objectSpaceQuadricError);
        // }

        interface TraversalMetric {
            boundingSphereRadius: number;
            boundingSphereX: number;
            boundingSphereY: number;
            boundingSphereZ: number;
            maxQuadricError: number;
        }

        const errorOverDistanceThreshold: number = 0.1;
        const viewNearPlane = camera.near;
        // key function for the lod metric, whether to descend into higher detail
        function traverseChild_v2_1(instanceToEye: mat4, uniformScale: number, metric: TraversalMetric, errorScale: number): boolean {
            const c = instanceToEye.columns;
            const instanceToEye_m = new Matrix4(
                c[0][0], c[0][1], c[0][2], c[0][3],
                c[1][1], c[1][1], c[1][2], c[1][3],
                c[2][2], c[2][1], c[2][2], c[2][3],
                c[3][3], c[3][1], c[3][2], c[3][3],
            )
            // const instanceToEye_m = new Matrix4(
            //     c[0][0], c[1][1], c[2][2], c[3][3],
            //     c[0][1], c[1][1], c[2][2], c[3][3],
            //     c[0][2], c[1][1], c[2][2], c[3][3],
            //     c[0][3], c[1][1], c[2][2], c[3][3],
            // )
            const boundingSpherePos = new vec3(metric.boundingSphereX, metric.boundingSphereY, metric.boundingSphereZ);
            const minDistance       = viewNearPlane;
            const sphereDistance    = new Vector4(boundingSpherePos.x, boundingSpherePos.y, boundingSpherePos.z, 1).applyMatrix4(instanceToEye_m).length();
            const errorDistance     = Math.max(minDistance, sphereDistance - metric.boundingSphereRadius * uniformScale);
            const errorOverDistance = metric.maxQuadricError * uniformScale / errorDistance;
            
            // we are too coarse still
            return errorOverDistance >= errorOverDistanceThreshold * errorScale;
        }

        function traverseChild_v2_2(cameraPosition: vec3, uniformScale: number, metric: TraversalMetric, errorScale: number): boolean {
            return traverseChild_v2_1(mat4.makeTranslation(mul(cameraPosition, -1.0)), uniformScale, metric, errorScale);
        }


        // Returns whether `inner` is inside or equal to `outer`.
        function isInside(inner: Sphere, outer: Sphere): boolean {
            const radiusDifference = outer.radius - inner.radius;
            return (radiusDifference >= 0.0)  // if this is negative then `inner` cannot be inside `outer`
                && lengthSquared(sub(getSpherePosition(inner), getSpherePosition(outer))) <= radiusDifference * radiusDifference;
        }

        
        const cameraPosition = new vec3(0, 0, 0);
        
        {
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = "-20";
            slider.max = "20";
            slider.step = "0.1";
            slider.value = "0";
            slider.style.position = "absolute";
            slider.style.top = "50";
            slider.style.right = "20";
            document.body.appendChild(slider);
    
            slider.addEventListener("input", event => {
                cameraPosition.z = parseFloat(slider.value);
            })
        }



        document.querySelector(".stats-panel").style.display = "none";

        // threeCanvas.style.display = "none";

        
        let graphCanvas = document.createElement("canvas");
        graphCanvas.width = window.innerWidth;
        graphCanvas.height = window.innerHeight;
        document.body.append(graphCanvas);
        const ctx = graphCanvas.getContext("2d") as CanvasRenderingContext2D;
        
        
        function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.stroke();
        }

        function drawText(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
            ctx.strokeStyle = color;
            ctx.textAlign = "center";
            ctx.font = "8px arial";
            ctx.strokeText(text, x, y + 3);
        }

        const offset = 100;
        let x = 0;
        let y = 0;
        let prevLod = 0;

        function check(cameraPosition: vec3) {
            // for (const o of output) {
            //     console.log("o", o)

            //     x += offset;
            //     y = (o.lod * offset) + offset;

            //     if (prevLod !== o.lod) {
            //         x = offset;
            //     }

            //     drawCircle(ctx, x, y, 30, "red");
            //     drawText(ctx, x, y - 10, `CI: ${o.clusterIndex}`, "blue");
            //     drawText(ctx, x, y + 0, `PGI: ${o.parentGroupIndex}`, "blue");
            //     drawText(ctx, x, y + 10, `GI: ${o.groupIndex}`, "blue");

            //     prevLod = o.lod;
            // }

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);



            let data: any[] = [];
    
            let count = 0;
            function verifyNodeRecursive(m: LocalizedLodMesh, h: LodHierarchy, node: Node) {
                if (node.clusters && node.clusters.isLeafNode === 1) {
                    // Verify real cluster bounding spheres
                    // TODO: cluster bounding spheres in hierarchy are not bounding spheres of
                    // the cluster, but bounding spheres of the cluster's generating group.
                    const clusterRange: Range = m.lodMesh.groupClusterRanges[node.clusters.group];
                    for (let i = 0; i < clusterRange.count; i++) {
                        const clusterSphere: Sphere = m.lodMesh.clusterBoundingSpheres[clusterRange.offset + i];
                        const parentIndex: number = m.lodMesh.clusterGeneratingGroups[clusterRange.offset + i];
                        const groupError: number = m.lodMesh.groupQuadricErrors[node.clusters.group];
                        // const parentError = m.lodMesh.groupQuadricErrors[parentIndex];
                        const parentError = h.groupCumulativeQuadricError[parentIndex];
                        // const t = traverseChild2(cameraPosition, node, errorOverDistanceThreshold);
                        // const t = traverseChild1(instanceToEyem, node, errorOverDistanceThreshold);
                        // const t = traverseChild(instanceToEye, 1, node, errorOverDistanceThreshold);
                        // const t = traverseChild2(threeCamera.position, node, errorOverDistanceThreshold);
                        const metric: TraversalMetric = {
                            boundingSphereX: node.boundingSphere.x,
                            boundingSphereY: node.boundingSphere.y,
                            boundingSphereZ: node.boundingSphere.z,
                            boundingSphereRadius: node.boundingSphere.radius,
                            maxQuadricError: node.maxClusterQuadricError
                        }
                        // const t = traverseChild_v2_2(cameraPosition, 1, metric, errorOverDistanceThreshold);
                        // data.push({node: node, traverse: t});
                        count++;







                        const clusterGroup = node.clusters.group;

                        const error = conservativeErrorOverDistance(
                            mat4.makeTranslation(mul(cameraPosition, -1.0)),
                            h.groupCumulativeBoundingSpheres[clusterGroup],
                            h.groupCumulativeQuadricError[clusterGroup],
                        );

                        const parentGroupError = parentIndex !== 4294967295 ? conservativeErrorOverDistance(
                            mat4.makeTranslation(mul(cameraPosition, -1.0)),
                            h.groupCumulativeBoundingSpheres[parentIndex],
                            h.groupCumulativeQuadricError[parentIndex],
                        ) : Infinity;

                        // console.log(error, parentGroupError)

                        const t = error >= errorOverDistanceThreshold && parentGroupError < errorOverDistanceThreshold;
                        
                        
                        data.push({node: node, traverse: t});



                        const o = output[clusterRange.offset + i];
                        x += offset;
                        y = (o.lod * offset) + offset;
        
                        if (prevLod !== o.lod) {
                            x = offset;
                        }

                        let color = t ? "red" : "green";
                        // if (t === true && parentError < groupError) color = "red";

                        drawCircle(ctx, x, y, 30, color);
                        drawText(ctx, x, y - 10, `CI: ${o.clusterIndex}`, "blue");
                        drawText(ctx, x, y + 0, `PGI: ${parentIndex}`, "blue");
                        drawText(ctx, x, y + 10, `GI: ${node.clusters.group}`, "blue");
                        drawText(ctx, x, y + 20, `GE: ${groupError.toFixed(4)}`, "blue");
        
                        prevLod = o.lod;
                    }
                }
                else if (node.children) {
                    for (let i = 0; i <= node.children.childCountMinusOne; i++) {
                        const child: Node = h.nodes[node.children.childOffset + i];
                        // assert(isInside(child.boundingSphere, node.boundingSphere));
                        // EXPECT_TRUE(isInside(child.boundingSphere, node.boundingSphere));
                        // count++;
                        verifyNodeRecursive(m, h, child);
                    }
                }
                else {
                    // console.warn("Node: ", node)
                    throw Error("Node doesn't have clusters or children");
                }
            }
    
            verifyNodeRecursive(mesh, hierarchy, hierarchy.nodes[0]);
    
            // console.log("data", data);
            // console.log("count", count);

            let enabled = 0;
            for (const i in data) {
                const mesh = output[i].threeMesh;
                mesh.visible = false;

                if (data[i].traverse === true) {
                    mesh.visible = true;
                    enabled++
                }
            }
            // console.log(enabled);
        }

        setInterval(() => {
            console.log(cameraPosition)
            check(cameraPosition);
        }, 1000);

        
        // let groupGeneratingGroups: GroupGeneratingGroups = new GroupGeneratingGroups();
        // result = generateGroupGeneratingGroups(mesh.lodMesh.groupClusterRanges, mesh.lodMesh.clusterGeneratingGroups, groupGeneratingGroups);
        // let clusterNodes: number[] = new Array(mesh.lodMesh.clusterTriangleRanges.length).fill(0);
        // for (let nodeIndex = 0; nodeIndex < hierarchy.nodes.length; ++nodeIndex) {
        //     if (hierarchy.nodes[nodeIndex] && hierarchy.nodes[nodeIndex].clusters && hierarchy.nodes[nodeIndex].clusters.isLeafNode === 1) {
        //         const clusterIndices: Range = mesh.lodMesh.groupClusterRanges[hierarchy.nodes[nodeIndex].clusters.group];
        //         for (let i = clusterIndices.offset; i < clusterIndices.offset + clusterIndices.count; i++) {
        //             clusterNodes[i] = nodeIndex;
        //         }
        //     }
        // }



        // function createSeededRNG(seed) {
        //     // Parameters for a simple LCG (same as used in some C libraries)
        //     const m = 0x80000000; // 2^31
        //     const a = 1103515245;
        //     const c = 12345;
        //     let state = seed;
        
        //     return function () {
        //         state = (a * state + c) % m;
        //         return state / m;
        //     };
        // }
        
        // const rng = createSeededRNG(123);
        // const rng_max = 0x80000000 - 1;
        
        // // // Random number generator.
        // // std::default_random_engine rng(123);
        // // Returns a uniform random point on a sphere.
        // function randomPointOnSphere(sphere: Sphere): vec3 {
        //     // From https://www.pbr-book.org/4ed/Sampling_Algorithms/Sampling_Multidimensional_Functions#UniformlySamplingHemispheresandSpheres
        
        //     // Random Z coordinate on a unit sphere, in the range [-1, 1].
        //     const z = 1.0 - 2.0 * ((rng()) / (rng_max));
        //     // Choose a random point on the surface of the sphere at this z coordinate:
        //     const r = Math.sqrt(1.0 - z * z);
        //     const phi = 2.0 * Math.PI * ((rng()) / (rng_max));
        //     const randomOnUnitSphere: vec3 = new vec3(r * Math.cos(phi), r * Math.sin(phi), z);
        //     // Now scale and translate this.
        //     return add(getSpherePosition(sphere), mul(randomOnUnitSphere, sphere.radius));
        // }
        
        // function transformPoint(t: mat4, point: vec3): vec3 {
        //     let result: vec3 = new vec3(t.columns[3][0], t.columns[3][1], t.columns[3][2]);
        //     for (let i = 0; i < 3; i++) {
        //         for (let row = 0; row < 3; row++) {
        //             result[row] += t.columns[i][row] * point[i];
        //         }
        //     }
        //     return result;
        // }

        // function getSpherePosition(sphere: Sphere): vec3 {
        //     return new vec3(sphere.x, sphere.y, sphere.z);
        // }

        // function generatingSphere(groupSpheres: Sphere[], generatingGroupIndex: number): Sphere {
        //     return (generatingGroupIndex == ORIGINAL_MESH_GROUP) ? new Sphere() : groupSpheres[generatingGroupIndex];
        // }
        
        // function generatingError(groupErrors: number[], generatingGroupIndex: number): number {
        //     return (generatingGroupIndex == ORIGINAL_MESH_GROUP) ? 0.0 : groupErrors[generatingGroupIndex];
        // }
        
        // // Computes the conservative maximum arcsine of any geometric error relative to
        // // the camera, where 'transform' defines a transformation to eye-space.
        // function conservativeErrorOverDistance(transform: mat4, boundingSphere: Sphere, objectSpaceQuadricError: number): number {
        //     const radiusScale = 1.0;
        //     const maxError = objectSpaceQuadricError * radiusScale;
        //     const sphereDistance = length(transformPoint(transform, getSpherePosition(boundingSphere)));
        //     const errorDistance = Math.max(maxError, sphereDistance - boundingSphere.radius * radiusScale);
        //     return maxError / errorDistance;
        // }
        
        // function traverseChild1(viewInstanceTransform: mat4, node: Node, errorOverDistanceThreshold: number): boolean {
        //     return conservativeErrorOverDistance(viewInstanceTransform, node.boundingSphere, node.maxClusterQuadricError) >= errorOverDistanceThreshold;
        // }
        
        // function renderCluster1(viewInstanceTransform: mat4, quadricError: number, boundingSphere: Sphere, errorOverDistanceThreshold: number): boolean {
        //     return conservativeErrorOverDistance(viewInstanceTransform, boundingSphere, quadricError) < errorOverDistanceThreshold;
        // }
        
        // function traverseChild2(cameraPosition: vec3, node: Node, errorOverDistanceThreshold: number): boolean {
        //     return traverseChild1(mat4.makeTranslation(mul(cameraPosition, -1.0)), node, errorOverDistanceThreshold);
        // }
        
        // function renderCluster2(cameraPosition: vec3, quadricError: number, boundingSphere: Sphere, errorOverDistanceThreshold: number): boolean {
        //     return renderCluster1(mat4.makeTranslation(mul(cameraPosition, -1.0)), quadricError, boundingSphere, errorOverDistanceThreshold);
        // }
        
        // // Checks that there can be no overlapping geometry given two clusters from
        // // different LOD levels that represent the same surfcae. See renderCluster().
        // function verifyMutuallyExclusive(m: LocalizedLodMesh, h: LodHierarchy, cluster0: number, node0: Node, cluster1: number, node1: Node) {
        //     const cluster0Sphere: Sphere = generatingSphere(h.groupCumulativeBoundingSpheres, m.lodMesh.clusterGeneratingGroups[cluster0]);
        //     const cluster1Sphere: Sphere = generatingSphere(h.groupCumulativeBoundingSpheres, m.lodMesh.clusterGeneratingGroups[cluster1]);
        //     const cluster0QuadricError: number = generatingError(h.groupCumulativeQuadricError, m.lodMesh.clusterGeneratingGroups[cluster0]);
        //     const cluster1QuadricError: number = generatingError(h.groupCumulativeQuadricError, m.lodMesh.clusterGeneratingGroups[cluster1]);
        
        //     const errorOverDistanceThreshold: number = 0.9999;  // near worst case
        
        //     // for (let i = 0; i < 10; ++i) {
        //         const testCameraPos: vec3 = randomPointOnSphere(node0.boundingSphere);
        //         const begin0: boolean = traverseChild2(testCameraPos, node0, errorOverDistanceThreshold);
        //         const begin1: boolean = traverseChild2(testCameraPos, node1, errorOverDistanceThreshold);
        //         const end0: boolean = !renderCluster2(testCameraPos, cluster0QuadricError, cluster0Sphere, errorOverDistanceThreshold);
        //         const end1: boolean = !renderCluster2(testCameraPos, cluster1QuadricError, cluster1Sphere, errorOverDistanceThreshold);
        //         const bothVisible: boolean = begin0 && !end0 && begin1 && !end1;
        //         // EXPECT_FALSE(bothVisible);

        //         console.log(begin0, !end0, begin1, !end1);
        //         if (bothVisible) throw Error("Both visiible")
        //     // }
        // }
        
        // // Loop from mesh.lodMesh.groupClusterRanges.size() - 1 to 0.
        // for (let groupIndex = mesh.lodMesh.groupClusterRanges.length; (groupIndex--) > 0;) {
        //     const groupClusterRange: Range = mesh.lodMesh.groupClusterRanges[groupIndex];
        //     for (let clusterIndex = groupClusterRange.offset; clusterIndex < groupClusterRange.offset + groupClusterRange.count; clusterIndex++) {
        //         const generatingGroupIndex = mesh.lodMesh.clusterGeneratingGroups[clusterIndex];
        //         if (generatingGroupIndex == ORIGINAL_MESH_GROUP) continue;
        //         for (let generatingGeneratingGroupIndex of groupGeneratingGroups.get(generatingGroupIndex)) {
        //             let lastNode = 0xffffffff;  // Initialize to some value that doesn't appear in clusterNodes
        //             const generatingGeneratingClusterRange: Range = mesh.lodMesh.groupClusterRanges[generatingGeneratingGroupIndex];
        //             for (let i = 0; i < generatingGeneratingClusterRange.count; i++) {
        //                 const generatingGeneratingClusterIndex = generatingGeneratingClusterRange.offset + i;
        //                 // Skip clusters with the same nodes. The child node is a primary
        //                 // interest. Faster testing at the expense of a few less test cases that
        //                 // are near identical.
        //                 if (clusterNodes[generatingGeneratingClusterIndex] == lastNode) continue;
        //                 lastNode = clusterNodes[generatingGeneratingClusterIndex];

        //                 console.log(
        //                     clusterIndex,
        //                     hierarchy.nodes[clusterNodes[clusterIndex]],
        //                     generatingGeneratingClusterIndex,
        //                     hierarchy.nodes[clusterNodes[generatingGeneratingClusterIndex]]
        //                 )
        //                 verifyMutuallyExclusive(mesh, hierarchy, clusterIndex, hierarchy.nodes[clusterNodes[clusterIndex]],
        //                     generatingGeneratingClusterIndex,
        //                     hierarchy.nodes[clusterNodes[generatingGeneratingClusterIndex]]);
        //             }
        //         }
        //     }
        // }

    }

    scene.Start();
};

Application();