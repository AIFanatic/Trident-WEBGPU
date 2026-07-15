import { GPU } from '@trident/core';

class Dilator {
  static async Dilate(texture, iterations = 32) {
    const shader = await GPU.Shader.Create({
      code: `
              struct VOut {
                  @builtin(position) position : vec4f,
                  @location(0) uv : vec2f,
              };

              @group(0) @binding(0) var samp : sampler;
              @group(0) @binding(1) var src  : texture_2d<f32>;

              // Fullscreen triangle straight from the vertex index \u2014 no vertex buffer.
              const verts = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));

              @vertex fn vertexMain(@builtin(vertex_index) i : u32) -> VOut {
                  let p = verts[i];
                  var out : VOut;
                  out.position = vec4f(p, 0, 1);
                  out.uv = vec2f(0.5 * p.x + 0.5, 0.5 - 0.5 * p.y);
                  return out;
              }

              @fragment fn fragmentMain(in : VOut) -> @location(0) vec4f {
                  let c = textureSampleLevel(src, samp, in.uv, 0);
                  if (c.a > 0.0) { return c; }   // original or already padded \u2192 leave untouched

                  let texel = 1.0 / vec2f(textureDimensions(src));
                  var rgb  = vec3f(0);
                  var hits = 0.0;
                  for (var y = -1; y <= 1; y++) {
                      for (var x = -1; x <= 1; x++) {
                          let n = textureSampleLevel(src, samp, in.uv + vec2f(f32(x), f32(y)) * texel, 0);
                          if (n.a > 0.0) { rgb += n.rgb; hits += 1.0; }
                      }
                  }
                  // 0.25 tags a padded texel: below a 0.5 alpha-test, so the cutout stays crisp,
                  // but > 0 so the fill keeps spreading outward on the next pass.
                  if (hits > 0.0) { return vec4f(rgb / hits, 0.25); }
                  return c;
              }
              `,
      colorOutputs: [{ format: texture.format }],
      uniforms: {
        samp: { group: 0, binding: 0, type: "sampler" },
        src: { group: 0, binding: 1, type: "texture" }
      }
    });
    const a = GPU.RenderTexture.Create(texture.width, texture.height, texture.depth, texture.format);
    const b = GPU.RenderTexture.Create(texture.width, texture.height, texture.depth, texture.format);
    const sampler = new GPU.TextureSampler();
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.CopyTextureToTextureV3({ texture }, { texture: a });
    shader.SetSampler("samp", sampler);
    let read = a, write = b;
    for (let i = 0; i < iterations; i++) {
      shader.SetTexture("src", read);
      GPU.RendererContext.BeginRenderPass("Dilator", [{ target: write, clear: true }]);
      GPU.RendererContext.DrawVertex(shader, 3);
      GPU.RendererContext.EndRenderPass();
      [read, write] = [write, read];
    }
    GPU.Renderer.EndRenderFrame();
    (read === a ? b : a).Destroy();
    return read;
  }
}

export { Dilator };
