import { Component } from "./components/Component";
import { Mesh } from "./components/Mesh";

export interface Events {
    CallUpdate: (component: Component, flag: boolean) => void;
    MeshUpdated: (mesh: Mesh, type: "geometry" | "shader") => void;
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