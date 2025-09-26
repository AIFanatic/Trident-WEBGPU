import { Components, Scene, GPU, Mathf, GameObject } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { ParticleSystem } from "@trident/plugins/ParticleSystem/ParticleSystem";

import { UIButtonStat, UIColorStat, UIFolder, UIGradientStat, UISliderStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { GradientEditor } from "@trident/plugins/ui/GradientEditor";

async function Application(canvas: HTMLCanvasElement) {
    // const gradientEditor = new GradientEditor();
    // document.body.append(gradientEditor.container)

    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);


    const particleSystemGameObject = new GameObject(scene);
    const particleSystem = particleSystemGameObject.AddComponent(ParticleSystem);
    particleSystem.texture = await GPU.Texture.Load("./assets/textures/TXT_Fire_01.png");
    
    particleSystem.startLifetime = 2.5;
    particleSystem.startSpeed.set(1.5, 1.5, 1.5);
    particleSystem.startSize = 2.5;
    // particleSystem.shapeType = "cone"
    particleSystem.coneAngle = 5;
    particleSystem.radius = 0.1;
    
    particleSystem.rateOverTime = 10;
    // particleSystem.frameOvertime = "random";

    particleSystem.textureTiles.set(2,2);

    particleSystem.colorOverLifetimeAddColor({r: 1, g: 0.9013662, b: 0, t: 0});
    particleSystem.colorOverLifetimeAddAlpha({a: 0, t: 0});

    particleSystem.colorOverLifetimeAddColor({r: 1, g: 0.6759608, b: 0.2088236, t: 17.1 / 100});
    particleSystem.colorOverLifetimeAddAlpha({a: 1, t: 19.1 / 100});

    particleSystem.colorOverLifetimeAddColor({r: 1, g: 0.558496, b: 0.3176471, t: 31.8 / 100});

    particleSystem.colorOverLifetimeAddColor({r: 0, g: 0, b: 0, t: 100 / 100});
    particleSystem.colorOverLifetimeAddAlpha({a: 0, t: 100 / 100});





    const particlesFolder = new UIFolder(Debugger.ui, "Particles");
    new UIVecStat(particlesFolder, "Emitter position:", {min: -10, max: 10, step: 0.1, value: particleSystem.transform.position.x}, {min: -10, max: 10, step: 0.1, value: particleSystem.transform.position.y}, {min: -10, max: 10, step: 0.1, value: particleSystem.transform.position.z}, undefined, value => particleSystem.transform.position.set(value.x,value.y,value.z));
    new UISliderStat(particlesFolder, "Start size:", 0, 10, 0.01, particleSystem.startSize, value => particleSystem.startSize = value);
    new UISliderStat(particlesFolder, "Start lifetime:", 0, 20, 0.01, particleSystem.startLifetime, value => particleSystem.startLifetime = value);
    new UISliderStat(particlesFolder, "Rate over time:", 0, 100, 0.01, particleSystem.rateOverTime, value => particleSystem.rateOverTime = value);
    new UISliderStat(particlesFolder, "Shape type:", 0, 4, 1, particleSystem.shapeType, value => particleSystem.shapeType = value);
    new UIButtonStat(particlesFolder, "Emit from shell:", state => particleSystem.emitFromShell = state, particleSystem.emitFromShell);
    new UISliderStat(particlesFolder, "Radius:", 0, 10, 0.01, particleSystem.radius, value => particleSystem.radius = value);
    new UISliderStat(particlesFolder, "Cone angle:", 0, 3.14, 0.01, particleSystem.coneAngle, value => particleSystem.coneAngle = value);
    new UISliderStat(particlesFolder, "Cone height:", 0, 10, 0.01, particleSystem.coneHeight, value => particleSystem.coneHeight = value);
    new UIVecStat(particlesFolder, "Box extents:", {min: 0, max: 10, step: 0.1, value: particleSystem.boxHalfExtents.x}, {min: 0, max: 10, step: 0.1, value: particleSystem.boxHalfExtents.y}, {min: 0, max: 10, step: 0.1, value: particleSystem.boxHalfExtents.z}, undefined, value => particleSystem.boxHalfExtents.set(value.x,value.y,value.z));
    new UISliderStat(particlesFolder, "Frame overtime:", 0, 3, 1, particleSystem.frameOvertime, value => particleSystem.frameOvertime = value);
    // new UIColorStat(particlesFolder, "Color overtime0:", particleSystem.colorOverLifetime0.toHex().slice(0, 7), value => particleSystem.colorOverLifetime0.copy(Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16))));
    // new UIColorStat(particlesFolder, "Color overtime1:", particleSystem.colorOverLifetime1.toHex().slice(0, 7), value => particleSystem.colorOverLifetime1.copy(Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16))));
    new UIVecStat(particlesFolder, "Start speed:", {min: 0, max: 10, step: 0.1, value: particleSystem.startSpeed.x}, {min: 0, max: 10, step: 0.1, value: particleSystem.startSpeed.y}, {min: 0, max: 10, step: 0.1, value: particleSystem.startSpeed.z}, undefined, value => particleSystem.startSpeed.set(value.x,value.y,value.z));
    new UIVecStat(particlesFolder, "Gravity:", {min: -10, max: 10, step: 0.1, value: particleSystem.gravity.x}, {min: -10, max: 10, step: 0.1, value: particleSystem.gravity.y}, {min: -10, max: 10, step: 0.1, value: particleSystem.gravity.z}, undefined, value => particleSystem.gravity.set(value.x,value.y,value.z));

    new UIGradientStat(particlesFolder, "Gradient:", gradient => { particleSystem.colorOverLifetimeSetColorKeys(gradient.colorKeys), particleSystem.colorOverLifetimeSetAlphaKeys(gradient.alphaKeys)}, particleSystem.colorOverLifetimeGradients);



    particlesFolder.Open();

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));