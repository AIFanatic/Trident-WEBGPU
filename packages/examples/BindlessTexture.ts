import { DebugTextureViewer } from "@trident/plugins/DebugTextureViewer";
import { Atlas, AtlasViewer } from "@trident/plugins/Atlas";
// import { WEBGPUTimestampQuery } from "../renderer/webgpu/WEBGPUTimestampQuery";

import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    VertexAttribute,
    IndexAttribute,
    Utils,
} from "@trident/core";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    // const t1 = await RenderTexture.Load("./test-assets/Beech_trees/GLTF/Map 24-Map 24.png");
    const t2 = await GPU.RenderTexture.Load("./assets/textures/32x32.png");
    const t3 = await GPU.RenderTexture.Load("./assets/textures/64x64.png");
    // const t3 = await RenderTexture.Load("./assets/img/brickwall_albedo.png");
    // const t4 = await RenderTexture.Load("./assets/img/toybox_normal.png");

    const t5 = await GPU.RenderTexture.Load("./assets/textures/brick-wall_albedo.png");

    const atlas = new Atlas(16);

    // // atlas.AddTexture(t1);
    // // atlas.AddTexture(t2);
    // // atlas.AddTexture(t3);
    // // atlas.AddTexture(t4);
    // atlas.AddTexture(t5);
    // atlas.AddTexture(t2);
    
    // atlas.AddTexture(t5);
    // atlas.AddTexture(t2);

    // atlas.AddTexture(t5);

    // atlas.AddTexture(t2);
    // atlas.AddTexture(t2);

    // atlas.AddTexture(t3);

    // atlas.AddTexture(t2);

    // atlas.AddTexture(t3);
    // atlas.AddTexture(t3);

    // atlas.AddTexture(t2);


    // const b1d = new Float32Array(2 * 2).map(v => Math.random())
    // const b1d = new Float32Array([32, 64, 72, 128]);
    const b1d = new Float32Array([0.1, 0.2, 0.5, 0.8]);
    console.log(b1d);
    const b1 = GPU.Buffer.Create(b1d.length * 4, GPU.BufferType.STORAGE);
    b1.SetArray(b1d)
    const i = atlas.AddBuffer(b1);
    console.log(i)

    // atlas.AddTexture(t2);

    // for (let i = 0; i < 7; i++) {
    //     atlas.AddTexture(t5);
    // }

    // const textureViewer = new TextureViewer();
    // textureViewer.execute(t1);
    const atlasViewer = new AtlasViewer();
    atlasViewer.execute(atlas, 0);

    
    function render() {
        atlasViewer.execute(atlas, 12);
        // textureViewer.execute(t1);
        // WEBGPUTimestampQuery.GetResult().then(frameTimes => {
        //     if (frameTimes) {
        //         for (const [name, time] of frameTimes) {
        //             RendererDebug.SetPassTime(name, time);
        //         }
        //     }
        // });
        requestAnimationFrame(() => { render() })
    }

    render();
};

Application(document.querySelector("canvas"));