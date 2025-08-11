import {
    Geometry,
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
} from "@trident/core";

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


        

        const shader = await GPU.Shader.Create({
            code: `
            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vPosition : vec3<f32>,
                @location(1) vNormal : vec3<f32>,
                @location(2) vUv : vec2<f32>,
            };

            @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;

            @group(0) @binding(4) var skybox: texture_cube<f32>;
            @group(0) @binding(5) var skybox_sampler: sampler;

            @group(0) @binding(6) var skybox_texture: texture_2d<f32>;
            @group(0) @binding(7) var sample_dir_texture: texture_2d<f32>;
            @group(0) @binding(8) var sample_dir_texture_sampler: sampler;

            @group(0) @binding(9) var<storage, read> envmapFace: f32;

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
            
                output.position = vec4(input.position, 1.0);
                output.vUv = input.uv;
                output.vPosition = 0.5 * (input.position);

                return output;
            }

            struct FragmentOutput {
                @location(0) albedo : vec4f,
                @location(1) normal : vec4f,
                @location(2) RMO : vec4f,
            };

            // Compute a direction vector for a given face of the cubemap.
            // The incoming UV (in [0,1]) is converted to [-1,1] coordinates,
            // and then a direction is chosen based on the provided face index.
            fn getDirection(face: u32, uv: vec2<f32>) -> vec3<f32> {
                // remap UV from [0, 1] to [-1, 1]
                let a = uv * 2.0 - 1.0;
                var dir: vec3<f32>;
                if (face == 0u) {          // +X face
                   // Change these if your +X face appears rotated:
                   dir = vec3<f32>( 1.0, -a.y, -a.x);
                } else if (face == 1u) {   // -X face
                   dir = vec3<f32>(-1.0, -a.y,  a.x);
                } else if (face == 2u) {   // +Y face
                   dir = vec3<f32>( a.x,  1.0,  a.y);
                } else if (face == 3u) {   // -Y face
                   dir = vec3<f32>( a.x, -1.0, -a.y);
                } else if (face == 4u) {   // +Z face
                   dir = vec3<f32>( a.x, -a.y,  1.0);
                } else {                   // face == 5u, -Z face
                   dir = vec3<f32>(-a.x, -a.y, -1.0);
                }
                return normalize(dir);
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                let samples = 128;
                let diffusivity = 0.5;
                let resolution = 128;

                // let pos = input.vPosition.xyz;
                let pos = getDirection(u32(envmapFace), input.vUv);
                let dir = normalize(pos);
                var sum = vec3(0.0);
                var q = 0.0;
                for (var i = 0; i < 16384; i++) {
                    if (i >= samples) {
                        break;
                    }
                    var r = textureSample(sample_dir_texture, sample_dir_texture_sampler, vec2f(f32(i)/f32(samples), 0.5)).rgb;
                    r = normalize(r * 2.0 - 1.0);
                    let newdir = dir + r * diffusivity;
                    let weight = dot(newdir, dir);
                    q += weight;
                    sum += textureSample(skybox, skybox_sampler, newdir).rgb * weight;
                }
                return vec4(sum/q, 1);
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
                viewMatrix: { group: 0, binding: 1, type: "storage" },
                modelMatrix: { group: 0, binding: 2, type: "storage" },
                cameraPosition: { group: 0, binding: 3, type: "storage" },

                skybox: { group: 0, binding: 4, type: "texture" },
                skybox_sampler: { group: 0, binding: 5, type: "sampler" },

                skybox_texture: { group: 0, binding: 6, type: "texture" },
                sample_dir_texture: { group: 0, binding: 7, type: "texture" },
                sample_dir_texture_sampler: { group: 0, binding: 8, type: "sampler-non-filterable" },

                envmapFace: { group: 0, binding: 9, type: "storage" },
            },
        })

        function random(scale: number): Mathf.Vector3 {
            scale = scale || 1.0;
            let r = Math.random() * 2.0 * Math.PI;
            let z = Math.random() * 2.0 - 1.0;
            let zScale = Math.sqrt(1.0 - z * z) * scale;
            return new Mathf.Vector3(Math.cos(r) * zScale, Math.sin(r) * zScale, z * scale);
        }

        const opts = {
            samples: 128
        }
        const sampleDirData: number[] = [];
        for (let i = 0; i < opts.samples; i++) {
            const r = random(1);
            sampleDirData.push(r.x);
            sampleDirData.push(r.y);
            sampleDirData.push(r.z);
            sampleDirData.push(1.0);
        }
        console.log(sampleDirData)

        const sampleDirBuffer = GPU.Buffer.Create(sampleDirData.length * 4, GPU.BufferType.STORAGE);
        sampleDirBuffer.SetArray(new Float32Array(sampleDirData));
        const sampleDirTexture = GPU.Texture.Create(opts.samples, 1, 1, "rgba32float");
        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.CopyBufferToTexture({buffer: sampleDirBuffer}, {texture: sampleDirTexture}, [128, 1, 1]);
        GPU.Renderer.EndRenderFrame();

        shader.SetArray("projectionMatrix", camera.projectionMatrix.elements);
        // shader.SetArray("modelMatrix", camera.viewMatrix.elements);
        shader.SetArray("viewMatrix", camera.viewMatrix.elements);
        shader.SetTexture("skybox", c);
        shader.SetSampler("skybox_sampler", GPU.TextureSampler.Create());
        shader.SetTexture("skybox_texture", t);
        shader.SetTexture("sample_dir_texture", sampleDirTexture);
        shader.SetSampler("sample_dir_texture_sampler", GPU.TextureSampler.Create({
            magFilter: "nearest",
            minFilter: "nearest",
            mipmapFilter: "nearest"
        }));



        // const irradianceMap = CubeTexture.Create(c.width, c.height, 6, "rgba16float");
        const irradianceMap = GPU.Texture.Create(t.width, t.height, 1, "rgba16float");
        const renderTarget = GPU.RenderTexture.Create(1024, 1024, 1, "rgba16float");

        const destinations = [
            [2048, 1024, 0],
            [0, 1024, 0],
            [1024, 0, 0],
            [1024, 2048, 0],
            [1024, 1024, 0],
            [3072, 1024, 0],
        ]
        for (let i = 0; i < 6; i++) {
            shader.SetValue("envmapFace", i);

            GPU.Renderer.BeginRenderFrame();
            GPU.RendererContext.BeginRenderPass("IrradianceMap", [{target: renderTarget, clear: true}], undefined);
            GPU.RendererContext.DrawGeometry(Geometry.Plane(), shader);
            GPU.RendererContext.EndRenderPass();

            GPU.RendererContext.CopyTextureToTextureV3( { texture: renderTarget, origin: [0, 0, 0] }, { texture: irradianceMap, origin: destinations[i] }, [1024, 1024, 1]);

            GPU.Renderer.EndRenderFrame();
        }



        {
            const planeGO = new GameObject(scene);
            planeGO.transform.scale.set(10, 10, 10);
            // planeGO.transform.position.set(0, 1, -5);
    
            shader.SetMatrix4("modelMatrix", planeGO.transform.localToWorldMatrix);
            const sphereMesh = planeGO.AddComponent(Components.Mesh);
            await sphereMesh.SetGeometry(Geometry.Plane());
            sphereMesh.AddMaterial(new PBRMaterial({
                albedoMap: irradianceMap,
                unlit: true
            }))
        }

        {
            const planeGO = new GameObject(scene);
            planeGO.transform.scale.set(10, 10, 10);
            planeGO.transform.position.x = 30;
    
            shader.SetMatrix4("modelMatrix", planeGO.transform.localToWorldMatrix);
            const sphereMesh = planeGO.AddComponent(Components.Mesh);
            await sphereMesh.SetGeometry(Geometry.Plane());
            sphereMesh.AddMaterial(new PBRMaterial({
                albedoMap: t,
                unlit: true
            }))
        }



        // Renderer.BeginRenderFrame();
        // // +X face (Right)
        // RendererContext.CopyTextureToTextureV3( { texture: t, origin: [2048, 1024, 0] }, { texture: c, origin: [0, 0, 0] }, [1024, 1024, 1]);
        // // -X face (Left)
        // RendererContext.CopyTextureToTextureV3( { texture: t, origin: [0, 1024, 0] }, { texture: c, origin: [0, 0, 1] }, [1024, 1024, 1]);
        // // +Y face (Top)
        // RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 0, 0] }, { texture: c, origin: [0, 0, 2] }, [1024, 1024, 1]);
        // // -Y face (Bottom)
        // RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 2048, 0] }, { texture: c, origin: [0, 0, 3] }, [1024, 1024, 1]);
        // // +Z face (Front)
        // RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 1024, 0] }, { texture: c, origin: [0, 0, 4] }, [1024, 1024, 1]);
        // // -Z face (Back)
        // RendererContext.CopyTextureToTextureV3( { texture: t, origin: [3072, 1024, 0] }, { texture: c, origin: [0, 0, 5] }, [1024, 1024, 1]);
        // Renderer.EndRenderFrame();

        // scene.renderPipeline.skybox = c;


        // const planeGO = new GameObject(scene);
        // planeGO.transform.scale.set(10, 10, 10);
        // // planeGO.transform.position.set(0, 1, -5);
        // const sphereMesh = planeGO.AddComponent(Mesh);
        // await sphereMesh.SetGeometry(Geometry.Cube());

        // const shader = await Shader.Create({
        //     code: `
        //     struct VertexInput {
        //         @builtin(instance_index) instanceIdx : u32, 
        //         @location(0) position : vec3<f32>,
        //         @location(1) normal : vec3<f32>,
        //         @location(2) uv : vec2<f32>,
        //     };
            
        //     struct VertexOutput {
        //         @builtin(position) position : vec4<f32>,
        //         @location(0) vPosition : vec3<f32>,
        //         @location(1) vNormal : vec3<f32>,
        //         @location(2) vUv : vec2<f32>,
        //     };

        //     @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
        //     @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;

        //     @group(0) @binding(4) var skybox: texture_cube<f32>;
        //     @group(0) @binding(5) var skybox_sampler: sampler;

        //     @group(0) @binding(6) var skybox_texture: texture_2d<f32>;
        //     @group(0) @binding(7) var sample_dir_texture: texture_2d<f32>;
        //     @group(0) @binding(8) var sample_dir_texture_sampler: sampler;

        //     @vertex
        //     fn vertexMain(input: VertexInput) -> VertexOutput {
        //         var output : VertexOutput;
            
        //         output.position = projectionMatrix * viewMatrix * vec4(input.position, 1.0);
        //         output.vUv = input.uv;
        //         output.vPosition = 0.5 * (input.position);

        //         return output;
        //     }

        //     struct FragmentOutput {
        //         @location(0) albedo : vec4f,
        //         @location(1) normal : vec4f,
        //         @location(2) RMO : vec4f,
        //     };

        //     @fragment
        //     fn fragmentMain(input: VertexOutput) -> FragmentOutput {
        //         var output: FragmentOutput;
        //         var cubemapVec = input.vPosition.xyz;
        //         cubemapVec.z *= -1;

        //         // let c = textureSample(skybox, skybox_sampler, cubemapVec);
        //         let c = textureSample(sample_dir_texture, sample_dir_texture_sampler, input.vUv);
        //         let ca = floor(c* 128 + 128).rgb;
        //         // let c = PixelShaderFunction(input.vPosition.xyz);
        //         output.albedo = vec4(c.rgb, 0.2);




        //         let samples = 128;
        //         let diffusivity = 0.5;
        //         let resolution = 128;

        //         let pos = input.vPosition.xyz;
        //         let dir = normalize(pos);
        //         var sum = vec3(0.0);
        //         var q = 0.0;
        //         for (var i = 0; i < 16384; i++) {
        //             if (i >= samples) {
        //                 break;
        //             }
        //             var r = textureSample(sample_dir_texture, sample_dir_texture_sampler, vec2f(f32(i)/f32(samples), 0.5)).rgb;
        //             r = normalize(r * 2.0 - 1.0);
        //             let newdir = dir + r * diffusivity;
        //             let weight = dot(newdir, dir);
        //             q += weight;
        //             sum += textureSample(skybox, skybox_sampler, newdir).rgb * weight;
        //         }
        //         // gl_FragColor = vec4(sum/q, 1);
        //         output.albedo = vec4(sum/q, 0.2);

        //         output.normal = vec4(input.vNormal, 0.1);
        //         output.RMO = vec4(vec3(0.0), 1.0);

        //         return output;
        //     }
        //     `,
        //     colorOutputs: [
        //         { format: "rgba16float" },
        //     ],
        //     attributes: {
        //         position: { location: 0, size: 3, type: "vec3" },
        //         normal: { location: 1, size: 3, type: "vec3" },
        //         uv: { location: 2, size: 2, type: "vec2" }
        //     },
        //     uniforms: {
        //         projectionMatrix: { group: 0, binding: 0, type: "storage" },
        //         viewMatrix: { group: 0, binding: 1, type: "storage" },
        //         modelMatrix: { group: 0, binding: 2, type: "storage" },
        //         cameraPosition: { group: 0, binding: 3, type: "storage" },

        //         skybox: { group: 0, binding: 4, type: "texture" },
        //         skybox_sampler: { group: 0, binding: 5, type: "sampler" },

        //         skybox_texture: { group: 0, binding: 6, type: "texture" },
        //         sample_dir_texture: { group: 0, binding: 7, type: "texture" },
        //         sample_dir_texture_sampler: { group: 0, binding: 8, type: "sampler-non-filterable" },
        //     },
        // })

        // function random(scale: number): Vector3 {
        //     scale = scale || 1.0;
        //     let r = Math.random() * 2.0 * Math.PI;
        //     let z = Math.random() * 2.0 - 1.0;
        //     let zScale = Math.sqrt(1.0 - z * z) * scale;
        //     return new Vector3(Math.cos(r) * zScale, Math.sin(r) * zScale, z * scale);
        // }

        // const opts = {
        //     samples: 128
        // }
        // const sampleDirData: number[] = [];
        // for (let i = 0; i < opts.samples; i++) {
        //     const r = random(1);
        //     sampleDirData.push(r.x);
        //     sampleDirData.push(r.y);
        //     sampleDirData.push(r.z);
        //     sampleDirData.push(1.0);
        // }
        // console.log(sampleDirData)

        // const sampleDirBuffer = Buffer.Create(sampleDirData.length * 4, BufferType.STORAGE);
        // sampleDirBuffer.SetArray(new Float32Array(sampleDirData));
        // const sampleDirTexture = Texture.Create(opts.samples, 1, 1, "rgba32float");
        // Renderer.BeginRenderFrame();
        // RendererContext.CopyBufferToTexture({buffer: sampleDirBuffer}, {texture: sampleDirTexture}, [128, 1, 1]);
        // Renderer.EndRenderFrame();

        // shader.SetArray("projectionMatrix", camera.projectionMatrix.elements);
        // shader.SetArray("viewMatrix", camera.viewMatrix.elements);
        // shader.SetTexture("skybox", c);
        // shader.SetSampler("skybox_sampler", TextureSampler.Create());
        // shader.SetTexture("skybox_texture", t);
        // shader.SetTexture("sample_dir_texture", sampleDirTexture);
        // shader.SetSampler("sample_dir_texture_sampler", TextureSampler.Create({
        //     magFilter: "nearest",
        //     minFilter: "nearest",
        //     mipmapFilter: "nearest"
        // }));
        // // sphereMesh.AddMaterial(p);

        // const renderTarget = RenderTextureCube.Create(Renderer.width, Renderer.height, 6, "rgba16float");
        // // Renderer.BeginRenderFrame();
        // // RendererContext.BeginRenderPass("IrradianceMap", [{target: renderTarget, clear: true}], undefined);
        // // // renderTarget.SetActiveLayer(0);
        // // RendererContext.DrawGeometry(Geometry.Cube(), shader);
        // // RendererContext.EndRenderPass();
        // // Renderer.EndRenderFrame();

        // // setInterval(() => {
        // //     planeGO.transform.position.copy(camera.transform.position)    
        // // }, 100);
    }

    scene.Start();
};

Application();