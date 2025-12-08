import { RendererContext } from "../renderer";
import { Component, SerializedComponent } from "./Component";
import { Renderable } from "./Renderable";

export class Mesh extends Renderable {
    public static type = "@trident/core/components/Mesh";

    public OnPreRender(): void {
        if (!this.geometry || !this.material || !this.material?.shader) return;
        this.material.shader.SetMatrix4("modelMatrix", this.transform.localToWorldMatrix);
    }

    public OnRenderObject(): void {
        if (!this.geometry || !this.material || !this.material?.shader) return;
        RendererContext.DrawGeometry(this.geometry, this.material.shader);
    }

    public Serialize(metadata: any = {}): SerializedComponent {
        return {
            type: Mesh.type,
            renderable: super.Serialize(metadata)
        }
    }

    public Deserialize(data: any) {
        super.Deserialize(data.renderable);
    }
}

Component.Registry.set(Mesh.type, Mesh);