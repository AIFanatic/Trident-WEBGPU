import {
    Components,
    Mathf,
    Geometry,
    VertexAttribute,
    Component,
    GPU,
    GameObject
} from "@trident/core";

export class LineRenderer extends Component {
    private geometry: Geometry;
    private material: GPU.Material;
    private mesh: Components.Mesh;
    
    constructor(gameObject: GameObject) {
        super(gameObject);
        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(3)));
        this.geometry.attributes.set("color", new VertexAttribute(new Float32Array(8)));
    }

    public async Start() {
        this.material = new GPU.Material({isDeferred: false});
        this.material.shader = await GPU.Shader.Create({
            code: `
            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) color : vec4<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vPosition : vec3<f32>,
                @location(1) vColor : vec3<f32>,
            };
            
            @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
            
                var modelMatrixInstance = modelMatrix[input.instanceIdx];
                var modelViewMatrix = viewMatrix * modelMatrixInstance;
            
                output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
                
                output.vPosition = input.position;
                output.vColor = input.color.rgb;
            
                return output;
            }
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                return vec4f(input.vColor, 1.0);
            }
            `,
            colorOutputs: [{format: "rgba16float"}],
            depthOutput: "depth24plus",
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                color: {location: 1, size: 4, type: "vec4"},
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 0, binding: 2, type: "storage"},
            },
            cullMode: "none",
            topology: GPU.Topology.Lines
        })

        this.mesh = this.gameObject.AddComponent(Components.Mesh);
        this.mesh.name = "LineRenderer";
        await this.mesh.SetGeometry(this.geometry);
        this.mesh.AddMaterial(this.material);
    }

    public SetPositions(positions: Mathf.Vector3[] | Float32Array) {
        let positionsF32 = positions instanceof Float32Array ? positions : new Float32Array(positions.length * 3);
        if (!(positions instanceof Float32Array)) {
            for (let i = 0; i < positions.length; i++) {
                positionsF32[i * 3 + 0] = positions[i].x;
                positionsF32[i * 3 + 1] = positions[i].y;
                positionsF32[i * 3 + 2] = positions[i].z;
            }
        }
        const positionsAtrtibute = this.geometry.attributes.get("position");
        if (positionsAtrtibute) positionsAtrtibute.Destroy();
        this.geometry.attributes.set("position", new VertexAttribute(positionsF32));

        if (this.geometry.attributes.get("color").array.length / 4 !== positionsF32.length / 3) {
            this.SetColors(new Float32Array(positionsF32.length / 3 * 4).fill(1));
        }
    }

    public SetColors(colors: Mathf.Color[] | Float32Array) {
        let colorsF32 = colors instanceof Float32Array ? colors : new Float32Array(colors.length * 4);
        if (!(colors instanceof Float32Array)) {
            for (let i = 0; i < colors.length; i++) {
                colorsF32[i * 4 + 0] = colors[i].r;
                colorsF32[i * 4 + 1] = colors[i].g;
                colorsF32[i * 4 + 2] = colors[i].b;
                colorsF32[i * 4 + 3] = colors[i].a;
            }
        }

        const colorsAttribute = this.geometry.attributes.get("color");
        if (colorsAttribute) colorsAttribute.Destroy();
        this.geometry.attributes.set("color", new VertexAttribute(colorsF32));
    }
}