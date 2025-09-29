import { Components, Scene, GPU, Mathf, GameObject, Geometry, PBRMaterial, Component } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 10000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    // const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(100, 100, 100);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();

    {
        const floorGameObject = new GameObject(scene);
        floorGameObject.transform.eulerAngles.x = -90;
        floorGameObject.transform.position.y = -1;
        const floorMesh = floorGameObject.AddComponent(Components.Mesh);
        floorMesh.geometry = Geometry.Cube();
        floorMesh.material = new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0, 1)});
    }

    Debugger.Enable();

    const serialized = JSON.stringify(scene.Serialize());
    // console.log(scene.Serialize());

    const scene2 = new Scene(renderer);
    scene2.Deserialize(JSON.parse(serialized));

    const cameras = scene2.GetComponents(Components.Camera);
    const controls = new OrbitControls(canvas, Components.Camera.mainCamera);

    scene2.Start();

    




    // setTimeout(() => {
    //     const serialized = `{"name":"Default scene","mainCamera":"594507","gameObjects":[{"name":"MainCamera","transform":{"type":"@trident/core/components/Transform","position":{"type":"@trident/core/math/Vector3","x":0,"y":0,"z":10},"rotation":{"type":"@trident/core/math/Quaternion","x":0,"y":0,"z":0,"w":1},"scale":{"type":"@trident/core/math/Vector3","x":1,"y":1,"z":1}},"components":[{"type":"@trident/core/components/Camera","name":"_Camera","id":"594507","backgroundColor":{"type":"@trident/core/math/Color","r":0,"g":0,"b":0,"a":1},"near":0.01,"far":100,"fov":72,"aspect":1.6216216216216217}]},{"name":"GameObject","transform":{"type":"@trident/core/components/Transform","position":{"type":"@trident/core/math/Vector3","x":-4,"y":4,"z":4},"rotation":{"type":"@trident/core/math/Quaternion","x":-0.27984814233312133,"y":-0.3647051996310009,"z":-0.11591689595929515,"w":0.8804762392171493},"scale":{"type":"@trident/core/math/Vector3","x":1,"y":1,"z":1}},"components":[{"type":"@trident/core/components/DirectionalLight","camera":{"type":"@trident/core/components/Camera","name":"_Camera","id":"159678","backgroundColor":{"type":"@trident/core/math/Color","r":0,"g":0,"b":0,"a":1}},"color":{"type":"@trident/core/math/Color","r":1,"g":1,"b":1,"a":1},"intensity":1,"range":10,"castShadows":true,"direction":{"type":"@trident/core/math/Vector3","x":0,"y":1,"z":0}}]},{"name":"GameObject","transform":{"type":"@trident/core/components/Transform","position":{"type":"@trident/core/math/Vector3","x":0,"y":-2,"z":0},"rotation":{"type":"@trident/core/math/Quaternion","x":-0.7071067811865475,"y":0,"z":0,"w":0.7071067811865476},"scale":{"type":"@trident/core/math/Vector3","x":100,"y":100,"z":100}},"components":[{"type":"@trident/core/components/Mesh","geometry":{"id":"593626","name":"","attributes":[{"attributeType":"@trident/core/Geometry/VertexAttribute","array":[-1,-1,0,1,-1,0,1,1,0,-1,1,0],"arrayType":"float32","currentOffset":0,"currentSize":48,"name":"position"},{"attributeType":"@trident/core/Geometry/VertexAttribute","array":[0,0,1,0,0,1,0,0,1,0,0,1],"arrayType":"float32","currentOffset":0,"currentSize":48,"name":"normal"},{"attributeType":"@trident/core/Geometry/VertexAttribute","array":[0,1,1,1,1,0,0,0],"arrayType":"float32","currentOffset":0,"currentSize":32,"name":"uv"}],"index":{"attributeType":"@trident/core/Geometry/IndexAttribute","array":[0,1,2,2,3,0],"arrayType":"uint32","currentOffset":0,"currentSize":24}},"materials":[{"isDeferred":true,"type":"@trident/core/renderer/Material/PBRMaterial","params":{"albedoColor":{"type":"@trident/core/math/Color","r":1,"g":1,"b":1,"a":1},"emissiveColor":{"type":"@trident/core/math/Color","r":0,"g":0,"b":0,"a":0},"roughness":0,"metalness":0,"doubleSided":false,"alphaCutoff":0,"unlit":false,"wireframe":false,"isSkinned":false}}],"enableShadows":true}]},{"name":"GameObject","transform":{"type":"@trident/core/components/Transform","position":{"type":"@trident/core/math/Vector3","x":0,"y":-1,"z":0},"rotation":{"type":"@trident/core/math/Quaternion","x":-0.7071067811865475,"y":0,"z":0,"w":0.7071067811865476},"scale":{"type":"@trident/core/math/Vector3","x":1,"y":1,"z":1}},"components":[{"type":"@trident/core/components/Mesh","geometry":{"id":"939864","name":"","attributes":[{"attributeType":"@trident/core/Geometry/VertexAttribute","array":[0.5,0.5,0.5,0.5,0.5,-0.5,0.5,-0.5,0.5,0.5,-0.5,-0.5,-0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,-0.5,-0.5,-0.5,-0.5,0.5,-0.5,0.5,-0.5,0.5,0.5,-0.5,-0.5,0.5,0.5,0.5,0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,0.5,-0.5,-0.5,-0.5,0.5,-0.5,-0.5,-0.5,0.5,0.5,0.5,0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,0.5,0.5,0.5,-0.5,-0.5,0.5,-0.5,0.5,-0.5,-0.5,-0.5,-0.5,-0.5],"arrayType":"float32","currentOffset":0,"currentSize":288,"name":"position"},{"attributeType":"@trident/core/Geometry/VertexAttribute","array":[0,1,1,1,0,0,1,0,0,1,1,1,0,0,1,0,0,1,1,1,0,0,1,0,0,1,1,1,0,0,1,0,0,1,1,1,0,0,1,0,0,1,1,1,0,0,1,0],"arrayType":"float32","currentOffset":0,"currentSize":192,"name":"uv"},{"attributeType":"@trident/core/Geometry/VertexAttribute","array":[1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1],"arrayType":"float32","currentOffset":0,"currentSize":288,"name":"normal"}],"index":{"attributeType":"@trident/core/Geometry/IndexAttribute","array":[0,2,1,2,3,1,4,6,5,6,7,5,8,10,9,10,11,9,12,14,13,14,15,13,16,18,17,18,19,17,20,22,21,22,23,21],"arrayType":"uint32","currentOffset":0,"currentSize":144}},"materials":[{"isDeferred":true,"type":"@trident/core/renderer/Material/PBRMaterial","params":{"albedoColor":{"type":"@trident/core/math/Color","r":1,"g":0,"b":0,"a":1},"emissiveColor":{"type":"@trident/core/math/Color","r":0,"g":0,"b":0,"a":0},"roughness":0,"metalness":0,"doubleSided":false,"alphaCutoff":0,"unlit":false,"wireframe":false,"isSkinned":false}}],"enableShadows":true}]}]}`;
    //     const scene2 = new Scene(renderer);
    //     scene2.Deserialize(JSON.parse(serialized));
    //     scene2.Start();
    // }, 100);




    // scene.Start();
};

Application(document.querySelector("canvas"));