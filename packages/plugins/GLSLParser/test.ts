import { GLSL2WGSL } from "./GLSLParser";

function normalizeCode(source: string) {
    return source
        .replace(/\s+/g, " ")
        .replace(/\s*([{}();,:<>+\-*/%=?])\s*/g, "$1")
        .trim();
}

function assertWGSL(name: string, actual: string, expected: string) {
    const normalizedActual = normalizeCode(actual);
    const normalizedExpected = normalizeCode(expected);

    if (normalizedActual != normalizedExpected) {
        throw new Error([
            `${name}: WGSL output mismatch`,
            "",
            "Expected:",
            expected.trim(),
            "",
            "Actual:",
            actual.trim(),
        ].join("\n"));
    }
}

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`PASS ${name}`);
    }
    catch (err) {
        console.error(`FAIL ${name}`);
        throw err;
    }
}

test("converts uniforms and texture calls", () => {
    const glsl = `
        precision mediump float;
        uniform sampler2D tex;
        uniform float opacity;

        void main() {
            vec2 uv = vec2(0.5);
            vec4 color = texture2D(tex, uv);
            gl_FragColor = vec4(color.rgb, opacity);
        }
    `;

    const wgsl = `
        @group(0) @binding(0) var tex: texture_2d<f32>;
        @group(0) @binding(1) var texSampler: sampler;
        @group(0) @binding(2) var<uniform> opacity: f32;
        fn main() {
            var uv: vec2<f32> = vec2<f32>(0.5);
            var color: vec4<f32> = textureSample(tex, texSampler, uv);
            gl_FragColor = vec4<f32>(color.rgb, opacity);
        }
    `;

    assertWGSL("uniforms and texture calls", GLSL2WGSL(glsl), wgsl);
});

test("drops shader locations without stage", () => {
    assertWGSL("standalone varying", GLSL2WGSL("varying vec2 vTexCoord;"), "");
});

test("converts functions, loops, and conditionals", () => {
    const glsl = `
        float sum4(float value) {
            float total = 0.0;
            for (int i = 0; i < 4; i++) {
                total += value;
            }
            if (total > 2.0) {
                return total;
            } else {
                return value;
            }
        }
    `;

    const wgsl = `
        fn sum4(value: f32) -> f32 {
            var total: f32 = 0.0;
            for (var i: i32 = 0; i < 4; i++) {
                total += value;
            }
            if (total > 2.0) {
                return total;
            } else {
                return value;
            }
        }
    `;

    assertWGSL("functions, loops, and conditionals", GLSL2WGSL(glsl), wgsl);
});

test("converts comma declarations and single-line if", () => {
    const glsl = `
        void main() {
            float a, b = 1.0, c;
            if (b > 0.0) a = b;
            else c = b;
        }
    `;

    const wgsl = `
        fn main() {
            var a: f32;
            var b: f32 = 1.0;
            var c: f32;
            if (b > 0.0) {
                a = b;
            } else {
                c = b;
            }
        }
    `;

    assertWGSL("comma declarations and single-line if", GLSL2WGSL(glsl), wgsl);
});

test("keeps qualified function parameters as parameters", () => {
    const glsl = `
        void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            fragColor = vec4(fragCoord, 0.0, 1.0);
        }
    `;

    const wgsl = `
        fn mainImage(fragColor: ptr<function, vec4<f32>>, fragCoord: vec2<f32>) {
            *fragColor = vec4<f32>(fragCoord, 0.0, 1.0);
        }
    `;

    assertWGSL("qualified function parameters", GLSL2WGSL(glsl), wgsl);
});

test("converts ternary expressions", () => {
    const glsl = `
        vec4 encode(float x, vec3 c) {
            return x <= 0.0 ? vec4(0.0) : vec4(c, 1.0);
        }
    `;

    const wgsl = `
        fn encode(x: f32, c: vec3<f32>) -> vec4<f32> {
            return select(vec4<f32>(c, 1.0), vec4<f32>(0.0), x <= 0.0);
        }
    `;

    assertWGSL("ternary expressions", GLSL2WGSL(glsl), wgsl);
});

test("converts void parameter list", () => {
    const glsl = `
        void main(void) {
            float value = 1.0;
        }
    `;

    const wgsl = `
        fn main() {
            var value: f32 = 1.0;
        }
    `;

    assertWGSL("void parameter list", GLSL2WGSL(glsl), wgsl);
});

test("converts GLSL types and constructors", () => {
    const glsl = `
        void main() {
            bool flag = bool(false);
            int index = int(1.0);
            uint count = uint(1);
            float value = float(0.0);
            vec2 v2 = vec2(1.0);
            vec3 v3 = vec3(1.0);
            vec4 v4 = vec4(1.0);
            ivec2 i2 = ivec2(1);
            ivec3 i3 = ivec3(1);
            ivec4 i4 = ivec4(1);
            uvec2 u2 = uvec2(1);
            uvec3 u3 = uvec3(1);
            uvec4 u4 = uvec4(1);
            bvec2 b2 = bvec2(false);
            bvec3 b3 = bvec3(false);
            bvec4 b4 = bvec4(false);
            mat2 m2;
            mat3 m3;
            mat4 m4;
        }
    `;

    const wgsl = `
        fn main() {
            var flag: bool = bool(false);
            var index: i32 = i32(1.0);
            var count: u32 = u32(1);
            var value: f32 = f32(0.0);
            var v2: vec2<f32> = vec2<f32>(1.0);
            var v3: vec3<f32> = vec3<f32>(1.0);
            var v4: vec4<f32> = vec4<f32>(1.0);
            var i2: vec2<i32> = vec2<i32>(1);
            var i3: vec3<i32> = vec3<i32>(1);
            var i4: vec4<i32> = vec4<i32>(1);
            var u2: vec2<u32> = vec2<u32>(1);
            var u3: vec3<u32> = vec3<u32>(1);
            var u4: vec4<u32> = vec4<u32>(1);
            var b2: vec2<bool> = vec2<bool>(false);
            var b3: vec3<bool> = vec3<bool>(false);
            var b4: vec4<bool> = vec4<bool>(false);
            var m2: mat2x2<f32>;
            var m3: mat3x3<f32>;
            var m4: mat4x4<f32>;
        }
    `;

    assertWGSL("GLSL types and constructors", GLSL2WGSL(glsl), wgsl);
});

test("converts array function parameters", () => {
    const glsl = `
        void project(out float values[3]) {
            values[0] = 1.0;
        }

        void main() {
            float values[3];
            project(values);
        }
    `;

    const wgsl = `
        fn project(values: ptr<function, array<f32, 3>>) {
            (*values)[0] = 1.0;
        }
        fn main() {
            var values: array<f32, 3>;
            project(&values);
        }
    `;

    assertWGSL("array function parameters", GLSL2WGSL(glsl), wgsl);
});

test("adds private address space to module vars", () => {
    const glsl = `
        const float pi = 3.14159265;
        float sh_project_band0 = 1.0/2.0 * sqrt(1.0/pi);
    `;

    const wgsl = `
        const pi: f32 = 3.14159265;
        var<private> sh_project_band0: f32 = 1.0 / 2.0 * sqrt(1.0 / pi);
    `;

    assertWGSL("module vars", GLSL2WGSL(glsl), wgsl);
});

test("converts vertex stage IO", () => {
    const glsl = `
        attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUV;

        void main() {
            vUV = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    const wgsl = `
        struct VertexInput {
            @location(0) position: vec3<f32>,
            @location(1) uv: vec2<f32>,
        }
        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) vUV: vec2<f32>,
        }
        @vertex fn main(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.vUV = input.uv;
            output.position = vec4<f32>(input.position, 1.0);
            return output;
        }
    `;

    assertWGSL("vertex stage IO", GLSL2WGSL(glsl, { stage: "vertex" }), wgsl);
});

test("converts fragment stage IO", () => {
    const glsl = `
        precision mediump float;
        uniform sampler2D tex;
        varying vec2 vUV;

        void main() {
            gl_FragColor = texture2D(tex, vUV);
        }
    `;

    const wgsl = `
        @group(0) @binding(0) var tex: texture_2d<f32>;
        @group(0) @binding(1) var texSampler: sampler;
        struct FragmentInput {
            @location(0) vUV: vec2<f32>,
        }
        struct FragmentOutput {
            @location(0) color: vec4<f32>,
        }
        @fragment fn main(input: FragmentInput) -> FragmentOutput {
            var output: FragmentOutput;
            output.color = textureSample(tex, texSampler, input.vUV);
            return output;
        }
    `;

    assertWGSL("fragment stage IO", GLSL2WGSL(glsl, { stage: "fragment" }), wgsl);
});

console.log("GLSLParser tests passed");
