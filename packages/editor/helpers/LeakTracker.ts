import { Component, Renderer, Runtime, Scene, SceneManager } from "@trident/core";

export class LeakTracker {
    private components: Map<string, WeakRef<Component>> = new Map();

    private updateOk = 0;       // Update calls from components in active scene
    private updateLeaked = 0;   // Update calls from anywhere else

    private wrapped = new WeakSet<Function>();
    private instrument(c: Component) {
        let proto: any = Object.getPrototypeOf(c);
        while (proto && !Object.prototype.hasOwnProperty.call(proto, "Update")) proto = Object.getPrototypeOf(proto);
        if (!proto || this.wrapped.has(proto.Update)) return;
        const orig = proto.Update;
        const self = this;
        const wrap = function (this: Component) {
            if (this.gameObject?.scene === Runtime.SceneManager.GetActiveScene()) self.updateOk++;
            else self.updateLeaked++;
            return orig.call(this);
        };
        this.wrapped.add(wrap);
        proto.Update = wrap;
    }



    constructor() {
        setInterval(() => {
            this.Update();
        }, 1000);
    }

    private GetComponentKey(scene: Scene, component: Component): string {
        return `${scene.id}-${component.id}`;
    }

    private Update() {
        const currentScene = Runtime.SceneManager.GetActiveScene();
        const sceneComponents = Array.from(currentScene.componentsByType.values()).flat(Infinity) as Component[];

        // Add all components from current scene
        for (const component of sceneComponents) {
            this.components.set(this.GetComponentKey(currentScene, component), new WeakRef(component));
            this.instrument(component)
        }

        let stats = {
            gc: 0,
            active: new Array<Component>(),
            activeCurrentScene: new Array<Component>(),

        }
        // Check which components dont belong to the current scene and still exist
        for (const [key, componentRef] of this.components) {
            const component = componentRef.deref();
            if (!component) {
                stats.gc++;
                continue;
            }
            stats.active.push(component);

            const sceneId = key.split("-")[0];
            if (sceneId === currentScene.id) stats.activeCurrentScene.push(component);
        }

        const info = Renderer.info;
        console.log(`
            [LeakTracker]
                Total components: ${this.components.size}
                Current scene total components: ${sceneComponents.length}
                [Stats]:
                    Total garbage collected: ${stats.gc}
                    Currently active: ${stats.active.length}
                    Currently active in scene: ${stats.activeCurrentScene.length}
                    Not destroyed components: ${stats.active.length - stats.activeCurrentScene.length}
                    Updates: ${this.updateOk}/s scene, ${this.updateLeaked}/s leaked
                    GPU: ${info.gpuBufferCount} buffers (${(info.gpuBufferSizeTotal/1024/1024).toFixed(1)} MB), ${info.gpuTextureCount} textures (${(info.gpuTextureSizeTotal/1024/1024).toFixed(1)} MB)
        `)

        this.updateOk = 0;
        this.updateLeaked = 0;
    }
}

new LeakTracker();