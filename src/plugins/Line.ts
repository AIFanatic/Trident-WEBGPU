import { GameObject } from "../GameObject";
import { Geometry, VertexAttribute } from "../Geometry";
import { Scene } from "../Scene";
import { Mesh } from "../components/Mesh";
import { Vector3 } from "../math/Vector3";
import { Material } from "../renderer/Material";
import { Shader, Topology } from "../renderer/Shader";

export class Line {
    private geometry: Geometry;
    
    constructor(scene: Scene, from: Vector3, to: Vector3, color = new Vector3(1,1,1)) {
        this.Create(scene, from, to, color)
    }

    private async Create(scene: Scene, from: Vector3, to: Vector3, color = new Vector3(1,1,1)) {
        const m = new Material({isDeferred: true});
        m.shader = await Shader.Create({
            code: `
            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) color : vec3<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vPosition : vec3<f32>,
                @location(1) vColor : vec3<f32>,
            };
            
            @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            @group(0) @binding(3) var<storage, read> cameraPosition: vec4<f32>;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
            
                var modelMatrixInstance = modelMatrix[input.instanceIdx];
                var modelViewMatrix = viewMatrix * modelMatrixInstance;
            
                output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
                
                output.vPosition = input.position;
                output.vColor = input.color;
                // output.vNormal = input.normal;
                // output.vUv = input.uv;
            
                return output;
            }
            
            struct FragmentOutput {
                @location(0) albedo : vec4f,
                @location(1) normal : vec4f,
                @location(2) RMO : vec4f,
            };
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                var output: FragmentOutput;
            
                var albedo = vec3f(input.vColor);
                var normal = vec3f(1.0);
                var unlit = 1.0;
                output.albedo = vec4(albedo.rgb, 1.0);
                output.normal = vec4(normal, 0.0);
                output.RMO = vec4(vec3(0.0), unlit);

                return output;
            }
            `,
            colorOutputs: [{format: "rgba16float"}, {format: "rgba16float"}, {format: "rgba16float"}],
            depthOutput: "depth24plus",
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                color: {location: 1, size: 3, type: "vec3"},
            },
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                modelMatrix: {group: 0, binding: 2, type: "storage"},
                cameraPosition: {group: 0, binding: 3, type: "storage"},
            },
            cullMode: "none",
            topology: Topology.Lines
        })

        
        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array([...from.elements, ...to.elements])));
        this.geometry.attributes.set("color", new VertexAttribute(new Float32Array([...color.elements, ...color.elements])));
        
        const linesGO = new GameObject(scene);
        const mesh = linesGO.AddComponent(Mesh);
        await mesh.SetGeometry(this.geometry);
        mesh.AddMaterial(m);
    }

    
    public SetFrom(from: Vector3) {
        if (!this.geometry) return;
        const p = this.geometry.attributes.get("position") as VertexAttribute;
        p.buffer.SetArray(new Float32Array([...from.elements]), 0);
    }

    public SetTo(to: Vector3) {
        if (!this.geometry) return;
        const p = this.geometry.attributes.get("position") as VertexAttribute;
        p.buffer.SetArray(new Float32Array([...to.elements]), 3 * 4);
    }

    public SetColor(color: Vector3) {
        if (!this.geometry) return;
        const p = this.geometry.attributes.get("color") as VertexAttribute;
        p.buffer.SetArray(new Float32Array([...color.elements, ...color.elements]), 0);
    }
}