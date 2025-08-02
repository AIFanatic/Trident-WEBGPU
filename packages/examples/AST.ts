interface Attribute {
    attribute: string;
    value: string;
}

interface Declaration {
    attribute: Attribute[];
    name: string | null;
    type: string[];
}

interface Expression {
    kind: string;
};

interface Binding extends Expression {
    kind: "binding";
    group: number;
    binding: number;
    types: string[];
    declaration: Declaration;
}

interface Struct extends Expression {
    kind: "struct";
    name: string;
    fields: Declaration[];
}

interface Fn extends Expression {
    kind: "function";
    entryType: string;
    name: string;
    parameters: Declaration[];
    returnType: Declaration | null;
}

function parse(tokens: string[]) {
    let pos = 0;

    function consume(expected) {
        if (tokens[pos] === expected) {
            pos++;
        } else {
            throw new Error(`Expected ${expected} but found ${tokens[pos]} at position ${pos}`);
        }
    }

    function parseType() {
        // const validTypes = ["vec2f", "vec3f", "vec4f", "vec2", "vec3", "vec4", "u32", "i32", "f32", "mat3x3", "mat4x4", "array", "texture_2d", "texture_depth_2d"];
        const typeTermination = ["{", "}", ":", ";", ",", ")"]
        let types: string[] = [];
        while (typeTermination.indexOf(tokens[pos]) === -1) types.push(tokens[pos++]);
        return types;
    }

    function parseAttribute(): Attribute[] {
        const attributeKeywords = ["@location", "@builtin", "@interpolate", "@group", "@binding"];

        let attributes: Attribute[] = [];
        if (attributeKeywords.includes(tokens[pos])) {
            const attribute = tokens[pos++];
            consume("(");
            const location = tokens[pos++];
            consume(")");
            attributes.push({attribute: attribute, value: location});
            if (attributeKeywords.includes(tokens[pos])) {
                attributes.push(...parseAttribute())
            }
        }
        return attributes;
    }

    function parseDeclaration(hasName = true): Declaration {
        const fieldAttribute = parseAttribute();
        let fieldName: string | null = null;
        if (hasName) {
            fieldName = tokens[pos++];
            if (tokens[pos] === ":") consume(":");
            else if (tokens[pos] === ")") consume(")");
            // pos++;
        }
        const fieldType = parseType();
        return { attribute: fieldAttribute, name: fieldName, type: fieldType };
    }

    function parseStruct(): Struct {
        consume("struct");
        const name = tokens[pos++];
        consume("{");
        const fields: Declaration[] = [];
        while (tokens[pos] !== "}") {
            const declaration = parseDeclaration();
            fields.push(declaration);
            if (tokens[pos] === ",") pos++;
        }
        consume("}");
        return { kind: "struct", name: name, fields: fields };
    }

    function parseBinding(): Binding {
        const attributes = parseAttribute();
        if (attributes.length !== 2) throw Error(`Expecting binding attributes to be (group and binding) but got ${attributes}`)
        
        const group = attributes.filter(value => value.attribute === "@group")[0].value;
        const binding = attributes.filter(value => value.attribute === "@binding")[0].value;
        consume("var");

        const validBindingTypes = ["storage", "uniform", "read", "read_write"];

        let bindingTypes: string[] = [];
        while (validBindingTypes.includes(tokens[pos])) {
            bindingTypes.push(tokens[pos++]);
            if (tokens[pos] === ",") consume(",");
            else break;
        }

        const declaration = parseDeclaration();
        return {kind: "binding", group: parseInt(group), binding: parseInt(binding), types: bindingTypes, declaration: declaration};
    }

    function parseEntryFunction(): Fn {
        const entryType = tokens[pos++];
        consume("fn");
        const name = tokens[pos++];
        consume("(");
        const parameters: Declaration[] = [];
        while (tokens[pos] !== ")") {
            const parameter = parseDeclaration();
            parameters.push(parameter);
            if (tokens[pos] === ",") pos++; // skip commas
        }
        consume(")");
        let returnType: Declaration | null = null;
        if (tokens[pos] === "->") {
            pos++;
            returnType = parseDeclaration(false);
        }
        consume("{"); while (tokens[pos] !== "}") pos++; consume("}"); // Skip function body
        return { kind: "function", entryType: entryType, name: name, parameters: parameters, returnType: returnType };
    }

    const ast: Expression[] = [];
    while (pos < tokens.length) {
        if (tokens[pos] === "struct") ast.push(parseStruct())
        else if (tokens[pos] === "@group" || tokens[pos] === "@binding") ast.push(parseBinding())
        else if (tokens[pos] === "@vertex" || tokens[pos] === "@fragment") ast.push(parseEntryFunction())
        else pos++; // skip unknown tokens
    }
    return ast;
}

function parseWGSL(code) {
    const tokens = code.split(/\s+|(;|\{|\}|\(|\)|:|,)|(?<!-)>|<(?!-)/).filter(Boolean);
    return parse(tokens);
}

// const code = `
// struct VertexInput {
//     @location(0) position : vec3<f32>,
//     @location(1) normal : vec3<f32>,
//     @location(2) uv : vec2<f32>,
// };

// struct VertexOutput {
//     @builtin(position) position : vec4<f32>,
//     @location(0) vPosition : vec3<f32>,
//     @location(1) vNormal : vec3<f32>,
//     @location(2) vUv : vec2<f32>,
//     @location(3) @interpolate(flat) instance : u32,
// };

// @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
// @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
// @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

// @group(0) @binding(4) var TextureSampler: sampler;

// // These get optimized out based on "USE*" defines
// @group(0) @binding(5) var AlbedoMap: texture_2d<f32>;
// @group(0) @binding(6) var NormalMap: texture_2d<f32>;
// @group(0) @binding(7) var HeightMap: texture_2d<f32>;
// @group(0) @binding(8) var RoughnessMap: texture_2d<f32>;
// @group(0) @binding(9) var MetalnessMap: texture_2d<f32>;
// @group(0) @binding(10) var EmissiveMap: texture_2d<f32>;
// @group(0) @binding(11) var AOMap: texture_2d<f32>;


// struct Material {
//     AlbedoColor: vec4<f32>,
//     EmissiveColor: vec4<f32>,
//     Roughness: f32,
//     Metalness: f32,
//     Unlit: f32
// };
// @group(0) @binding(3) var<storage, read> material: Material;

// @vertex
// fn vertexMain(@builtin(vertex_index) VertexIndex : u32) -> @builtin(position) vec4f {
//     var output : VertexOutput;

//     var modelMatrixInstance = modelMatrix[input.instanceIdx];
//     var modelViewMatrix = viewMatrix * modelMatrixInstance;

//     output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
    
//     output.vPosition = input.position;
//     output.vNormal = input.normal;
//     output.vUv = input.uv;

//     output.instance = input.instanceIdx;

//     return output;
// }
// `

// const code = `
// @vertex
// fn vertexMain(input: VertexInput) -> VertexOutput {
//     var output: VertexOutput;
//     output.position = vec4(input.position, 0.0, 1.0);
//     output.vUv = input.uv;
//     return output;
// }
// `

// const code = `
// struct VertexInput {
//     @builtin(instance_index) instanceIdx : u32, 
//     @location(0) position : vec3<f32>,
//     @location(1) normal : vec3<f32>,
//     @location(2) uv : vec2<f32>,
// };

// struct VertexOutput {
//     @builtin(position) position : vec4<f32>,
//     @location(0) vPosition : vec3<f32>,
//     @location(1) vNormal : vec3<f32>,
//     @location(2) vUv : vec2<f32>,
//     @location(3) @interpolate(flat) instance : u32,
// };

// @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
// @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
// @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

// @group(0) @binding(4) var TextureSampler: sampler;

// // These get optimized out based on "USE*" defines
// @group(0) @binding(5) var AlbedoMap: texture_2d<f32>;
// @group(0) @binding(6) var NormalMap: texture_2d<f32>;
// @group(0) @binding(7) var HeightMap: texture_2d<f32>;
// @group(0) @binding(8) var RoughnessMap: texture_2d<f32>;
// @group(0) @binding(9) var MetalnessMap: texture_2d<f32>;
// @group(0) @binding(10) var EmissiveMap: texture_2d<f32>;
// @group(0) @binding(11) var AOMap: texture_2d<f32>;


// struct Material {
//     AlbedoColor: vec4<f32>,
//     EmissiveColor: vec4<f32>,
//     Roughness: f32,
//     Metalness: f32,
//     Unlit: f32
// };
// @group(0) @binding(3) var<storage, read> material: Material;

// @vertex
// fn vertexMain(input: VertexInput) -> VertexOutput {
//     var output : VertexOutput;

//     var modelMatrixInstance = modelMatrix[input.instanceIdx];
//     var modelViewMatrix = viewMatrix * modelMatrixInstance;

//     output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
    
//     output.vPosition = input.position;
//     output.vNormal = input.normal;
//     output.vUv = input.uv;

//     output.instance = input.instanceIdx;

//     return output;
// }

// struct FragmentOutput {
//     @location(0) albedo : vec4f,
//     @location(1) normal : vec4f,
//     @location(2) RMO : vec4f,
// };

// fn inversesqrt(v: f32) -> f32 {
//     return 1.0 / sqrt(v);
// }

// fn getNormalFromMap(N: vec3f, p: vec3f, uv: vec2f ) -> mat3x3<f32> {
//     // get edge vectors of the pixel triangle
//     let dp1 = dpdx( p );
//     let dp2 = dpdy( p );
//     let duv1 = dpdx( uv );
//     let duv2 = dpdy( uv );

//     // solve the linear system
//     let dp2perp = cross( dp2, N );
//     let dp1perp = cross( N, dp1 );
//     let T = dp2perp * duv1.x + dp1perp * duv2.x;
//     let B = dp2perp * duv1.y + dp1perp * duv2.y;

//     // construct a scale-invariant frame 
//     let invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );
//     return mat3x3( T * invmax, B * invmax, N );
// }

// @fragment
// fn fragmentMain(input: VertexOutput) -> FragmentOutput {
//     var output: FragmentOutput;

//     let mat = material;

//     var uv = input.vUv;// * vec2(4.0, 2.0);

//     // #if USE_HEIGHT_MAP
//     // #endif
    
//     let tbn = getNormalFromMap(input.vNormal, input.vPosition, uv);
//     var modelMatrixInstance = modelMatrix[u32(input.instance)];

//     var albedo = mat.AlbedoColor;
//     var roughness = mat.Roughness;
//     var metalness = mat.Metalness;
//     var occlusion = 1.0;
//     var unlit = mat.Unlit;

//     // var albedo = mat.AlbedoColor;
//     #if USE_ALBEDO_MAP
//         albedo *= textureSample(AlbedoMap, TextureSampler, uv);
//     #endif

//     var normal: vec3f = input.vNormal;
//     #if USE_NORMAL_MAP
//         let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
//         normal = tbn * normalSample;

//         // let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
//         // normal = normalSample.xyz;
//     #endif
//     normal = normalize(modelMatrixInstance * vec4(normal, 1.0)).xyz;

//     #if USE_ROUGHNESS_MAP
//         roughness *= textureSample(RoughnessMap, TextureSampler, uv).r;
//     #endif

//     #if USE_METALNESS_MAP
//         metalness *= textureSample(MetalnessMap, TextureSampler, uv).r;
//     #endif

//     var emissive = mat.EmissiveColor;
//     #if USE_EMISSIVE_MAP
//         emissive *= textureSample(EmissiveMap, TextureSampler, uv);
//     #endif

//     #if USE_AO_MAP
//         occlusion = textureSample(AOMap, TextureSampler, uv).r;
//         occlusion = 1.0;
//     #endif

//     output.normal = vec4(normal, 1.0);
//     output.albedo = albedo;
//     output.RMO = vec4(roughness, metalness, occlusion, unlit);
//     return output;
// }
// `


const code = `
struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(4) color : vec4f,
  }
  
  @vertex
  fn vert_main(
    @location(0) a_particlePos : vec2f,
    @location(1) a_particleVel : vec2f,
    @location(2) a_pos : vec2f
  ) -> VertexOutput {
    let angle = -atan2(a_particleVel.x, a_particleVel.y);
    let pos = vec2(
      (a_pos.x * cos(angle)) - (a_pos.y * sin(angle)),
      (a_pos.x * sin(angle)) + (a_pos.y * cos(angle))
    );
    
    var output : VertexOutput;
    output.position = vec4(pos + a_particlePos, 0.0, 1.0);
    output.color = vec4(
      1.0 - sin(angle + 1.0) - a_particleVel.y,
      pos.x * 100.0 - a_particleVel.y + 0.1,
      a_particleVel.x + cos(angle + 0.5),
      1.0);
    return output;
  }
  
  @fragment
  fn frag_main(@location(4) color : vec4f) -> @location(0) vec4f {
    return color;
  }
  
`
const parser = parseWGSL(code);
console.log(parser)