import { Scene } from "./Scene";
import { Camera } from "./components/Camera";
import { Component } from "./components/Component";
import { Light } from "./components/Light";
import { MeshletMesh } from "./components/MeshletMesh";
import { Transform } from "./components/Transform";

export interface Events {
    AddedComponent: (component: Component, scene: Scene) => void;
    RemovedComponent: (component: Component, scene: Scene) => void;
    CallUpdate: (component: Component, flag: boolean) => void;
    TransformUpdated: (component: Transform) => void;
    LightUpdated: (light: Light) => void;
    MeshletUpdated: (meshlet: MeshletMesh) => void;
    MeshletDeleted: (meshlet: MeshletMesh) => void;
    MainCameraUpdated: (camera: Camera) => void;
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



export class EventSystemLocal {
    private static events: EventMap = {};

    public static on<K extends keyof Events>(event: K, callback: Events[K], id?: string) {
        const eventId = id ? `${event}-${id}` : event;
        if (!this.events[eventId]) this.events[eventId] = [];
        this.events[eventId].push(callback);
    }

    public static emit<K extends keyof Events>(event: K, id: string, ...args: Parameters<Events[K]>) {
        const eventId = `${event}-${id}`;
        if (!this.events[eventId]) return;
        for (let i = 0; i < this.events[eventId].length; i++) {
            this.events[eventId][i](...args);
        }
    }
}