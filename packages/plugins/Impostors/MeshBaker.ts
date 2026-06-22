import { GPU, Mathf, Components } from "@trident/core";

export class MeshBaker {
    public static async awaitShaders(meshes: Components.Mesh[]): Promise<void> {
        for (const mesh of meshes) void mesh.material.shader;
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
    }

    public static computeBounds(meshes: Components.Mesh[]): Mathf.BoundingVolume {
        const min = new Mathf.Vector3(+Infinity, +Infinity, +Infinity);
        const max = new Mathf.Vector3(-Infinity, -Infinity, -Infinity);
        const p = new Mathf.Vector3();
        for (const mesh of meshes) {
            const pos = mesh.geometry?.attributes.get("position")?.array as Float32Array;
            if (!pos) continue;
            for (let i = 0; i < pos.length; i += 3) {
                p.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(mesh.transform.localToWorldMatrix);
                min.min(p); max.max(p);
            }
        }
        const center = min.clone().add(max).mul(0.5);
        const radius = max.clone().sub(min).mul(0.5).length();
        return new Mathf.BoundingVolume(min, max, center, radius);
    }

    public static Bake(
        meshes: Components.Mesh[],
        modelMatrices: Float32Array,
        camera: Components.Camera,
        targets: {
            albedo: GPU.RenderTexture,
            normal: GPU.RenderTexture,
            ermo: GPU.RenderTexture,
            depth: GPU.DepthTexture,
        },
        viewport?: { x: number, y: number, width: number, height: number },
        clearColor = true,
    ) {
        const vw = viewport?.width ?? targets.albedo.width;
        const vh = viewport?.height ?? targets.albedo.height;

        const fb = new Float32Array(116);
        const tmp = new Mathf.Matrix4();
        fb.set([vw, vh, 0, 0], 0);
        fb.set([...camera.transform.position.elements, 0], 4);
        fb.set(tmp.copy(camera.projectionMatrix).invert().elements, 8);
        fb.set(tmp.copy(camera.viewMatrix).invert().elements, 24);
        fb.set(camera.viewMatrix.elements, 40);
        fb.set(camera.projectionMatrix.elements, 56);
        fb.set(camera.projectionMatrix.clone().mul(camera.viewMatrix).elements, 72);
        fb.set([camera.near, camera.far], 88);
        for (let i = 0; i < 6; i++) {
            fb.set([...camera.frustum.planes[i].normal.elements, camera.frustum.planes[i].constant], 92 + i * 4);
        }
        const frameBuffer = new GPU.Buffer(fb.byteLength, GPU.BufferType.STORAGE);
        frameBuffer.SetArray(fb);

        const modelMatrixBuffer = new GPU.Buffer(modelMatrices.byteLength, GPU.BufferType.STORAGE);
        modelMatrixBuffer.SetArray(modelMatrices);

        for (const mesh of meshes) {
            mesh.material?.shader?.SetBuffer("frameBuffer", frameBuffer);
            mesh.material?.shader?.SetBuffer("modelMatrix", modelMatrixBuffer);
        }

        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.BeginRenderPass("MeshBaker", [
            { target: targets.albedo, clear: clearColor },
            { target: targets.normal, clear: clearColor },
            { target: targets.ermo, clear: clearColor },
        ], { target: targets.depth, clear: true });

        if (viewport) {
            GPU.RendererContext.SetViewport(viewport.x, viewport.y, viewport.width, viewport.height);
            GPU.RendererContext.SetScissor(viewport.x, viewport.y, viewport.width, viewport.height);
        }

        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            if (!mesh.geometry?.attributes.has("position") || !mesh.material?.shader) continue;
            GPU.RendererContext.DrawGeometry(mesh.geometry, mesh.material.shader, 1, i);
        }

        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();
    }
}