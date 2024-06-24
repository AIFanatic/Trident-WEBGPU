import { Scene } from "./Scene";
import { Component } from "./components/Component";
import { Light } from "./components/Light";
import { Mesh } from "./components/Mesh";
import { Transform } from "./components/Transform";

export interface Events {
    AddedComponent: (component: Component, scene: Scene) => void;
    CallUpdate: (component: Component, flag: boolean) => void;
    TransformUpdated: (component: Transform) => void;
    LightUpdated: (light: Light) => void;
    MeshUpdated: (mesh: Mesh) => void;
};

interface EventMap {
    [event: string]: any;
}

export class EventSystem {
    private static events: EventMap = {};

    public static on<K extends keyof Events>(event: K, callback: Events[K]) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    public static emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
        const callbacks = this.events[event];
        if (!callbacks) return;
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](...args);
        }
    }
}