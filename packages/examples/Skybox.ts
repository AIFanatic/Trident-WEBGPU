import {
    Geometry,
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
} from "@trident/core";
import { Debugger } from "@trident/plugins/Debugger";
import { UIFolder } from "@trident/plugins/ui/UIStats";

import { OrbitControls } from "@trident/plugins/OrbitControls";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = document.body.clientWidth * aspectRatio;
canvas.height = document.body.clientHeight * aspectRatio;
canvas.style.width = `100vw`;
canvas.style.height = `100vh`;
document.body.appendChild(canvas);


async function Application() {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(4, 4, 4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.position.set(0, 6, -5);
        planeGO.transform.scale.set(3, 3, 3);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Cube());
        sphereMesh.AddMaterial(new PBRMaterial());
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.position.set(0, 1, -5);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial());
    }

    {
        const t = await GPU.Texture.Load("./assets/textures/HDR/empty_play_room_1k.png")
        const c = GPU.CubeTexture.Create(1024, 1024, 6);
    
        GPU.Renderer.BeginRenderFrame();
        // +X face (Right)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [2048, 1024, 0] }, { texture: c, origin: [0, 0, 0] }, [1024, 1024, 1]);
        // -X face (Left)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [0, 1024, 0] }, { texture: c, origin: [0, 0, 1] }, [1024, 1024, 1]);
        // +Y face (Top)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 0, 0] }, { texture: c, origin: [0, 0, 2] }, [1024, 1024, 1]);
        // -Y face (Bottom)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 2048, 0] }, { texture: c, origin: [0, 0, 3] }, [1024, 1024, 1]);
        // +Z face (Front)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 1024, 0] }, { texture: c, origin: [0, 0, 4] }, [1024, 1024, 1]);
        // -Z face (Back)
        GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [3072, 1024, 0] }, { texture: c, origin: [0, 0, 5] }, [1024, 1024, 1]);
        GPU.Renderer.EndRenderFrame();

        scene.renderPipeline.skybox = c;







        class SkyboxPass extends GPU.RenderPass {
            public name: string = "SkyboxPass";
            private skyboxShader: GPU.Shader;
            private skyboxGeometry: Geometry;
            private target: GPU.RenderTexture;
        
            constructor() {
                super({inputs: [GPU.PassParams.GBufferAlbedo], outputs: []});
            }
        
            public async init(resources: GPU.ResourcePool) {
        
                this.skyboxShader = await GPU.Shader.Create({
                    code: `
                    struct VertexInput {
                        @builtin(instance_index) instanceIdx : u32, 
                        @location(0) position : vec3<f32>,
                        @location(1) normal : vec3<f32>,
                        @location(2) uv : vec2<f32>,
                    };
                    
                    struct VertexOutput {
                        @builtin(position) position : vec4<f32>,
                        @location(0) uv : vec2<f32>,
                    };
                    
                    @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                    
                    @vertex
                    fn vertexMain(input: VertexInput) -> VertexOutput {
                        var output : VertexOutput;
                        output.position = vec4(input.position, 1.0);
                        output.uv = input.uv;
                        return output;
                    }
                    
                    @fragment
                    fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                        return vec4f(1.0, 0.0, 0.0, 1.0);
                    }
                    `,
                    colorOutputs: [
                        { format: "rgba16float" },
                    ],
                    attributes: {
                        position: { location: 0, size: 3, type: "vec3" },
                        normal: { location: 1, size: 3, type: "vec3" },
                        uv: { location: 2, size: 2, type: "vec2" }
                    },
                    uniforms: {
                        projectionMatrix: { group: 0, binding: 0, type: "storage" },
                    }
                })

                this.skyboxGeometry = Geometry.Plane();
                this.target = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
        
                this.initialized = true;
            }
        
            public execute(resources: GPU.ResourcePool) {
                if (!this.initialized) return;
        
                const gBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
                GPU.RendererContext.BeginRenderPass(this.name, [{ target: gBufferAlbedo, clear: true }], undefined, true);
                GPU.RendererContext.DrawGeometry(this.skyboxGeometry, this.skyboxShader);
                GPU.RendererContext.EndRenderPass();

                // GPU.RendererContext.CopyTextureToTexture(this.target, gBufferAlbedo);
            }
        }

        const test = new UIFolder(Debugger.ui, "Test");

        const skyboxRenderPass = new SkyboxPass();

        // scene.renderPipeline.AddPass(skyboxRenderPass, GPU.RenderPassOrder.AfterGBuffer);
    }


    scene.Start();
};

Application();