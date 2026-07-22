import { Camera } from "../../components/Camera";
import { Light } from "../../components/Light";
import { Renderable } from "../../components/Renderable";
import { Buffer } from "../Buffer";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { PassParams } from "../RenderingPipeline";

export type InstancedRenderable = Renderable & {
    matricesBuffer: Buffer;
    instanceCount: number;
};

export interface FrameRenderData {
    deferredRenderables: Renderable[];
    forwardRenderables: Renderable[];
    shadowCasters: Renderable[];
    shadowInstancedMeshes: InstancedRenderable[];
    lights: Light[];
}

const isInstancedRenderable = (renderable: Renderable): renderable is InstancedRenderable => {
    return (renderable as any).matricesBuffer !== undefined && (renderable as any).instanceCount !== undefined;
};

export class SceneExtractPass extends RenderPass {
    public name: string = "SceneExtractPass";

    public async init() {
        this.initialized = true;
    }

    public preFrame(resources: ResourcePool) {
        const camera = Camera.mainCamera;
        if (!camera) return;

        const scene = camera.gameObject.scene;
        const lights = scene.GetComponents(Light).filter(light => light.enabled && light.gameObject.enabled);

        const deferredRenderables: Renderable[] = [];
        const forwardRenderables: Renderable[] = [];
        const shadowCasters: Renderable[] = [];
        const shadowInstancedMeshes: InstancedRenderable[] = [];

        for (const [, renderable] of Renderable.Renderables) {
            if (renderable.gameObject.scene !== scene) continue;
            if (!renderable.enabled || !renderable.gameObject.enabled) continue;
            if (!renderable.geometry || !renderable.geometry.attributes?.has("position")) continue;
            if (!renderable.material || !renderable.material.shader) continue;

            if (renderable.material.params.isDeferred === true) deferredRenderables.push(renderable);
            else forwardRenderables.push(renderable);

            if (renderable.enableShadows) {
                if (isInstancedRenderable(renderable)) {
                    if (renderable.instanceCount > 0) shadowInstancedMeshes.push(renderable);
                } else {
                    shadowCasters.push(renderable);
                }
            }
        }

        const frameData: FrameRenderData = {
            deferredRenderables,
            forwardRenderables,
            shadowCasters,
            shadowInstancedMeshes,
            lights,
        };

        resources.setResource(PassParams.FrameRenderData, frameData);
    }
}