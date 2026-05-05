import { Components, Mathf, GameObject, Geometry, PBRMaterial, Runtime, VertexAttribute, IndexAttribute } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { HDRParser } from "@trident/plugins/HDRParser";

import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    
    function HighQualitySphere( radius = 0.5, widthSegments = 16, heightSegments = 16 ): Geometry {
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const theta = v * Math.PI;

            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let x = 0; x <= widthSegments; x++) {
                const u = x / widthSegments;
                const phi = u * Math.PI * 2;

                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const nx = -cosPhi * sinTheta;
                const ny = cosTheta;
                const nz = sinPhi * sinTheta;

                vertices.push(radius * nx, radius * ny, radius * nz);
                normals.push(nx, ny, nz);
                uvs.push(u, 1 - v);
            }
        }

        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const a = y * (widthSegments + 1) + x;
                const b = a + widthSegments + 1;
                const c = b + 1;
                const d = a + 1;

                if (y !== 0) {
                    indices.push(a, b, d);
                }

                if (y !== heightSegments - 1) {
                    indices.push(b, c, d);
                }
            }
        }

        const geometry = new Geometry();
        geometry.name = "HighQualitySphere";
        geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
        geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
        geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
        geometry.index = new IndexAttribute(new Uint32Array(indices));
        geometry.ComputeTangents();

        return geometry;
    }
    
    await Runtime.Create(canvas, window.devicePixelRatio);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 7);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(0, 0, 0);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 0;
    light.castShadows = false;

    const sphereGeometry = HighQualitySphere();

    const c = 8;
    const cM1 = c - 1;
    for (let i = 0; i < c; i++) {
        const sphereGameObject = new GameObject();
        sphereGameObject.transform.position.set((i - cM1 * 0.5) * 1.5, 1, 0);

        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = sphereGeometry;
        sphereMesh.material = new PBRMaterial({
            albedoColor: new Mathf.Color(1, 1, 1, 1),
            metalness: 1.0,
            roughness: i / cM1,
        });
    }

    for (let i = 0; i < c; i++) {
        const sphereGameObject = new GameObject();
        sphereGameObject.transform.position.set((i - cM1 * 0.5) * 1.5, -1, 0);

        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = sphereGeometry;
        sphereMesh.material = new PBRMaterial({
            albedoColor: new Mathf.Color(0.0, 0.0, 0.0, 1),
            metalness: 0.0,
            roughness: i / cM1,
        });

        console.log(i/cM1)
    }

    Debugger.Enable();

    // const hdr = await HDRParser.Load("./assets/textures/HDR/goegap_1k.hdr");
    const hdr = await HDRParser.Load("./assets/textures/HDR/pisa.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    Runtime.Play();
};

Application(document.querySelector("canvas") as HTMLCanvasElement);