import { GPU, Geometry, Scene, Components, Mathf, PBRMaterial } from '@trident/core';

class PathTracer extends GPU.RenderPass {
  name = "PathTracer";
  shader;
  needsMeshUpdate = true;
  samples = 4;
  bounces = 4;
  outputTexture;
  // compute output
  accumulation;
  // persistent accumulation
  uniformsBuffer = new ArrayBuffer(112);
  UniformsViews = {
    seed: new Float32Array(this.uniformsBuffer, 0, 1),
    weight: new Float32Array(this.uniformsBuffer, 4, 1),
    bounces: new Uint32Array(this.uniformsBuffer, 8, 1),
    samples: new Uint32Array(this.uniformsBuffer, 12, 1),
    cam_pos: new Float32Array(this.uniformsBuffer, 16, 4),
    cam_right: new Float32Array(this.uniformsBuffer, 32, 4),
    cam_up: new Float32Array(this.uniformsBuffer, 48, 4),
    cam_forward: new Float32Array(this.uniformsBuffer, 64, 4),
    resolution: new Float32Array(this.uniformsBuffer, 80, 4),
    mesh_count: new Uint32Array(this.uniformsBuffer, 96, 1)
  };
  currentMeshCount = 0;
  customBlender;
  customBlenderGeometry;
  customBlenderTarget;
  constructor() {
    super();
    const width = GPU.Renderer.width / 1;
    const height = GPU.Renderer.height / 1;
    console.log(width, height);
    this.outputTexture = GPU.RenderTextureStorage2D.Create(width, height, 1, "rgba16float");
    this.accumulation = GPU.Texture.Create(width, height, 1, "rgba16float");
  }
  async init(resources) {
    this.shader = await GPU.Compute.Create({
      code: `
            @group(0) @binding(0) var outputTex : texture_storage_2d<rgba16float, write>;
            @group(0) @binding(1) var inputTex : texture_2d<f32>;
            @group(0) @binding(2) var<storage> vertex: array<vec3f>;
            @group(0) @binding(3) var<storage> index: array<vec3u>;
            @group(0) @binding(4) var<storage> meshes: array<Mesh>;
            @group(0) @binding(5) var<storage> materials: array<Material>;
            @group(0) @binding(6) var<uniform> uniforms: Uniforms;
            
            struct Mesh {
              vi : u32, // first vertex
              fi : u32, // first face
              nv : u32, // total vertices
              nf : u32, // total faces
            }
            
            struct Material {
              color : vec4f,
              emission : vec4f,
              metallic : f32,
              roughness : f32,
            }
            
            struct Ray {
              origin : vec3<f32>,
              direction : vec3<f32>,
            }
            
            struct HitRecord {
              hit : bool,
              point : vec3<f32>,
              normal : vec3<f32>,
              material : Material,
              t: f32,
            }
            
            struct Uniforms {
                seed: f32,
                weight: f32,
                bounces: u32,
                samples: u32,
                cam_pos: vec4f,
                cam_right: vec4f,
                cam_up: vec4f,
                cam_forward: vec4f,
                resolution: vec4f, // x=width, y=height, z=tanHalfFov, w=aspect
                mesh_count: u32
            };
            
            var<private> seed : f32;
            var<private> pixel : vec2f;
            
            fn random() -> f32 {
              let result = fract(sin(seed / 100.0 * dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
              seed += 1.0;
              return result;
            }
            
            fn v2random() -> vec2f {
              let r1 = random();
              let r2 = random();
              return vec2f(r1, r2);
            }
            
            fn random_in_unit_disk() -> vec2f {
              let r1 = random()*2.0-1.0;
              let r2 = random()*2.0-1.0;
              return vec2f(r1, r2);
            }
            
            fn random_in_unit_sphere() -> vec3f {
              let r1 = random()*2.0-1.0;
              let r2 = random()*2.0-1.0;
              let r3 = random()*2.0-1.0;
              return vec3f(r1, r2, r3);
            }
            
            fn mesh_random_point(mesh : Mesh, pdf : ptr<function, f32>) -> vec3f{
              // get a random triangle, should be weighted with the triangles areas!
              let trg = min(u32(f32(mesh.nf) * random()), mesh.nf-1) + mesh.fi;
              
              let vi = index[trg];
              let v0 = vertex[vi[0]];
              let v1 = vertex[vi[1]];
              let v2 = vertex[vi[2]];
            
              let u = random();
              let v = random();
              let w = 1.0 - u - v;
            
              // here we are again assuming all the triangles have the same area
              let trg_area = length(cross(v1 - v0, v2 - v0)) * 0.5;
              *pdf = 1.0/(f32(mesh.nf)*trg_area);
            
              return v0*u + v1*v + v2*w;
            }
            
            fn ray_at(r: Ray, t : f32) -> vec3<f32> {
              return r.origin + r.direction * t;
            }
            
            // M\xF6ller\u2013Trumbore ray-triangle intersection algorithm
            // from http://www.graphics.cornell.edu/pubs/1997/MT97.pdf
            const EPSILON : f32 = 0.000001;
            fn triangle_hit(r : Ray, v0 : vec3<f32>, v1: vec3<f32>, v2 : vec3<f32>, t : ptr<function, f32>) -> bool {
              
              let e1 = v1 - v0;
              let e2 = v2 - v0;
              let p = cross(r.direction, e2);
              let det = dot(e1, p); 
            
              // check if ray is parallel to triangle
              if (abs(det) < EPSILON) { return false; }
            
              // calculate barycentric coordinate u
              let inv_det = 1.0 / det;
              let s = r.origin - v0; // called T in paper, not used here to avoid confusion with *t
              let u = inv_det * dot(s, p);
            
              if (u < 0.0 || u > 1.0) { return false; }
            
              // calculate barycentric coordinate v
              let q = cross(s, e1);
              let v = inv_det * dot(r.direction, q);
            
              if (v < 0.0 || u + v > 1.0) { return false; }
            
              // distance from the ray origin to the hit point
              *t = inv_det * dot(e2, q);
              if (*t < EPSILON) { return false; }
            
              // backface culling
              if (dot(cross(e1, e2), r.direction) > 0.0 ){ return false; }
            
              return true;
            }
            
            fn world_hit(r : Ray) -> HitRecord {
            
              var hit_rec : HitRecord;
              hit_rec.hit = false;
              var t = 100000000.0;
              var closest_hit = t;
            
              // loop through all the meshes in the scene
              for(var m = 0; m < i32(uniforms.mesh_count); m++){
            
                let mesh = meshes[m];
                // loop through all the triangles in each mesh
                for(var i = mesh.fi; i < mesh.fi+mesh.nf; i++){
            
                  let vi = index[i];
                  let v0 = vertex[vi[0]];
                  let v1 = vertex[vi[1]];
                  let v2 = vertex[vi[2]];
                  let hit_bool = triangle_hit(r, v0, v1, v2, &t);
            
                  // we have to return the closest hit to the ray origin
                  if(hit_bool && t < closest_hit) {
                    closest_hit = t;
                    hit_rec.hit = true;
                    hit_rec.t = t;
                    hit_rec.normal = normalize(cross(v1 - v0, v2 - v0));
                    hit_rec.point = ray_at(r, t) + hit_rec.normal*EPSILON;
                    hit_rec.material = materials[m];
                  }
                }
              }
              
              return hit_rec;
            }
            
            fn ray_color(r : Ray) -> vec3f {
            
              var depth = 0u;
              var color = vec3(0.0, 0.0, 0.0); // background color
              var ray = r;
              var hit_result = world_hit(ray);
            
              var final_color = vec3(0.0, 0.0, 0.0); // background at first
              var bounced_color = vec3(1.0, 1.0, 1.0);
            
              // recursion is not allowed
              while(depth < uniforms.bounces+1 && (hit_result.hit)){
            
                // if the ray hits a emissive material, return it directly
                if (hit_result.material.emission.a > 0.0) {
                  final_color = hit_result.material.emission.rgb;
                  break;
            
                } else if (hit_result.material.metallic >= random()) {
                  let hit_point = hit_result.point;
                  ray.origin = hit_point;
                  ray.direction = reflect(ray.direction, hit_result.normal);
            
                  // surface roughness
                  ray.direction += random_in_unit_sphere()*hit_result.material.roughness;
                  ray.direction = normalize(ray.direction);
            
                  bounced_color *= hit_result.material.color.rgb;
                  depth++;
            
                  hit_result = world_hit(ray);
            
                } else {
                  let hit_point = hit_result.point;
            
                  // bias towards lights
                  var light_pdf = 1.0;
                  let light_point = mesh_random_point(meshes[3], &light_pdf);
                  let lh = light_point - hit_point;
            
                  var shadow_ray : Ray;
                  shadow_ray.origin = hit_point;
                  shadow_ray.direction = normalize(lh);
            
                  var shadow_hit = world_hit(shadow_ray);
            
                  if (shadow_hit.material.emission.a > 0.0 && random()>0.5) {
                    final_color = (1/light_pdf)
                          * 1/(pow(shadow_hit.t, 2))
                          * shadow_hit.material.emission.rgb 
                          * abs(dot(shadow_hit.normal, shadow_ray.direction))
                          * hit_result.material.color.rgb
                          * abs(dot(hit_result.normal, shadow_ray.direction));
                    break;
            
                  } else {
                    //scatter
                    ray.origin = hit_point;
                    ray.direction = normalize(hit_result.normal + random_in_unit_sphere());
            
                    bounced_color *= hit_result.material.color.rgb;
                    depth++;
            
                    hit_result = world_hit(ray);
                  }
                }
              }
            
              color = final_color*bounced_color;
              return color;
            }
            
            @compute @workgroup_size(8, 8, 1)
            fn compute_main(@builtin(global_invocation_id) GlobalInvocationID: vec3u) {
            
                let pos = GlobalInvocationID.xy;
                pixel = vec2f(pos) / uniforms.resolution.xy;
                seed = uniforms.seed;

                var ray : Ray;
                var color = vec4(0.0, 0.0, 0.0, 1.0);
                var samples = uniforms.samples;

                for (var i = 0u; i < samples; i++) {
                    let jittered = vec2f(pos) + v2random();
                    var ndc = (jittered / uniforms.resolution.xy) * 2.0 - 1.0;
                    ndc.y = -ndc.y;
                    let tan_half_fov = uniforms.resolution.z;
                    let aspect = uniforms.resolution.w;

                    ray.origin = uniforms.cam_pos.xyz;
                    ray.direction = normalize(
                    uniforms.cam_forward.xyz +
                    ndc.x * uniforms.cam_right.xyz * aspect * tan_half_fov +
                    ndc.y * uniforms.cam_up.xyz * tan_half_fov
                    );

                    color += vec4(ray_color(ray), 1.0);
                }
            
                // gamma 2
                let newImage = clamp(sqrt(color/f32(samples)), vec4(0.0), vec4(1.0));
                let accumulated = textureLoad(inputTex, pos, 0);
                
                // weighted average between the new and the accumulated image
                let result_color = uniforms.weight * newImage + (1.0 - uniforms.weight) * accumulated;
                
                textureStore(outputTex, pos, result_color);
            }
            `,
      uniforms: {
        "outputTex": { group: 0, binding: 0, type: "storage-write-only" },
        "inputTex": { group: 0, binding: 1, type: "storage-read-only" }
      }
    });
    this.shader.SetTexture("outputTex", this.outputTexture);
    this.shader.SetTexture("inputTex", this.accumulation);
    this.customBlender = await GPU.Shader.Create({
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

                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;
                    output.position = vec4(input.position, 1.0);
                    output.uv = input.uv;
                    return output;
                }
                
                @group(0) @binding(0) var texSampler : sampler;
                @group(0) @binding(1) var lighting : texture_2d<f32>;
                @group(0) @binding(2) var pathTracer : texture_2d<f32>;

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let c = textureSample(lighting, texSampler, input.uv);
                    let p = textureSample(pathTracer, texSampler, input.uv);

                    // // return p + c;

                    // let l = (p.r + p.g + p.b) / 3.0;

                    // if (l > 0.1) {
                    //     return p;
                    // }
                    return c + p;
                }
            `,
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.customBlender.SetSampler("texSampler", GPU.TextureSampler.Create());
    this.customBlenderGeometry = Geometry.Plane();
    this.customBlenderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.initialized = true;
  }
  updateMeshBuffers() {
    const renderables = Scene.mainScene.GetComponents(Components.Renderable);
    if (renderables.length === 0) return;
    this.currentMeshCount = renderables.length;
    let vertexBuffer = [];
    let indexBuffer = [];
    let meshesBuffer = [];
    let materialsBuffer = [];
    let _v = new Mathf.Vector3();
    for (const renderable of renderables) {
      if (!renderable.geometry || !renderable.material) continue;
      if (!(renderable.material instanceof PBRMaterial)) continue;
      const vertices = renderable.geometry.attributes.get("position").array;
      const indices = renderable.geometry.index.array;
      meshesBuffer.push(...[vertexBuffer.length / 4, indexBuffer.length / 4, vertices.length / 3, indices.length / 3]);
      const vertexBase = vertexBuffer.length / 4;
      for (let i = 0; i < vertices.length; i += 3) {
        _v.set(vertices[i + 0], vertices[i + 1], vertices[i + 2]).applyMatrix4(renderable.transform.localToWorldMatrix);
        vertexBuffer.push(_v.x, _v.y, _v.z, 0);
      }
      for (let i = 0; i < indices.length; i += 3) {
        indexBuffer.push(indices[i + 0] + vertexBase, indices[i + 1] + vertexBase, indices[i + 2] + vertexBase, 0);
      }
      const pbrParams = renderable.material.params;
      materialsBuffer.push(...[...pbrParams.albedoColor.elements, ...pbrParams.emissiveColor.elements, pbrParams.metalness, pbrParams.roughness, 0, 0]);
    }
    this.shader.SetArray("vertex", new Float32Array(vertexBuffer));
    this.shader.SetArray("index", new Uint32Array(indexBuffer));
    this.shader.SetArray("meshes", new Uint32Array(meshesBuffer));
    this.shader.SetArray("materials", new Float32Array(materialsBuffer));
    this.needsMeshUpdate = false;
  }
  prevCameraRotation = new Mathf.Quaternion();
  prevCameraPosition = new Mathf.Vector3();
  step = 0;
  async preFrame(resources) {
    if (!this.initialized) return;
    if (this.needsMeshUpdate) this.updateMeshBuffers();
    const camera = Components.Camera.mainCamera;
    if (!camera) return;
    const cameraChanged = !this.prevCameraRotation.equals(camera.transform.rotation) || !this.prevCameraPosition.equals(camera.transform.position);
    this.prevCameraRotation.copy(camera.transform.rotation);
    this.prevCameraPosition.copy(camera.transform.position);
    if (cameraChanged) {
      this.step = 0;
    }
    this.step++;
    const transform = camera.transform;
    const camPos = transform.position;
    const camRight = new Mathf.Vector3(1, 0, 0).applyQuaternion(transform.rotation);
    const camUp = new Mathf.Vector3(0, 1, 0).applyQuaternion(transform.rotation);
    const camForward = new Mathf.Vector3(0, 0, -1).applyQuaternion(transform.rotation);
    const tanHalfFov = Math.tan(camera.fov * Math.PI / 180 * 0.5);
    const aspect = camera.aspect;
    this.UniformsViews.seed.set([GPU.Renderer.info.frame + Math.random()]);
    this.UniformsViews.weight.set([1 / (this.step + 1)]);
    this.UniformsViews.bounces.set([this.bounces >>> 0]);
    this.UniformsViews.samples.set([this.samples >>> 0]);
    this.UniformsViews.cam_pos.set([camPos.x, camPos.y, camPos.z, 0]);
    this.UniformsViews.cam_right.set([camRight.x, camRight.y, camRight.z, 0]);
    this.UniformsViews.cam_up.set([camUp.x, camUp.y, camUp.z, 0]);
    this.UniformsViews.cam_forward.set([camForward.x, camForward.y, camForward.z, 0]);
    this.UniformsViews.resolution.set([this.outputTexture.width, this.outputTexture.height, tanHalfFov, aspect]);
    this.UniformsViews.mesh_count.set([this.currentMeshCount]);
    this.shader.SetArray("uniforms", new Float32Array(this.uniformsBuffer));
    const LightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    if (LightingOutput) {
      this.customBlender.SetTexture("lighting", LightingOutput);
      this.customBlender.SetTexture("pathTracer", this.accumulation);
    }
  }
  async execute(resources) {
    if (this.needsMeshUpdate) return;
    const LightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    if (!LightingOutput) return;
    if (!this.initialized) return;
    if (this.step <= 100) {
      GPU.ComputeContext.BeginComputePass(this.name, false);
      GPU.ComputeContext.Dispatch(this.shader, Math.ceil(this.outputTexture.width / 8), Math.ceil(this.outputTexture.height / 8), 1);
      GPU.ComputeContext.EndComputePass();
    }
    GPU.RendererContext.CopyTextureToTexture(this.outputTexture, this.accumulation);
    GPU.RendererContext.BeginRenderPass(this.name + "- Blend", [{ target: this.customBlenderTarget, clear: true }]);
    GPU.RendererContext.DrawGeometry(this.customBlenderGeometry, this.customBlender);
    GPU.RendererContext.EndRenderPass();
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.customBlenderTarget }, { texture: LightingOutput });
  }
}

export { PathTracer };
