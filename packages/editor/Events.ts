import { IGameObject } from "./engine-api/trident/components/IGameObject";

export class GameObjectEvents {
    public static Selected = (gameObject: IGameObject) => {};
    public static Created = (gameObject: IGameObject) => {};
    public static Deleted = (gameObject: IGameObject) => {};
}

export class ProjectEvents {
    public static Opened = () => {};
}

export class FileEvents {
    public static Created = (path: string, handle: FileSystemFileHandle) => {};
    public static Changed = (path: string, handle: FileSystemFileHandle) => {};
    public static Deleted = (path: string, handle: FileSystemFileHandle) => {};
}

export class DirectoryEvents {
    public static Created = (path: string, handle: FileSystemDirectoryHandle) => {};
    public static Deleted = (path: string, handle: FileSystemDirectoryHandle) => {};
}

export class LayoutHierarchyEvents {
    public static Selected = (gameObject: IGameObject) => {};
}

export class EventSystem {
    private static events: Map<any, Function[]> = new Map();

    public static on<N>(event: N, callback: typeof event) {
        const events = this.events.get(event) || [];
        events.push(callback as Function);
        this.events.set(event, events);
    }

    public static emit<N>(event: N, ...args: N extends (...args: infer P) => void ? P : never) {
        const callbacks = this.events.get(event);
        if (callbacks === undefined) return;
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](...args);
        }
    }
}

export class EventSystemLocal {
    private static events: Map<any, Map<any, Function[]>> = new Map();

    public static on<N>(event: N, localId: any, callback: typeof event) {
        const localEvents = this.events.get(event) || new Map();
        const localEventsCallbacks = localEvents.get(localId) || [];
        localEventsCallbacks.push(callback);
        localEvents.set(localId, localEventsCallbacks);
        this.events.set(event, localEvents);
    }

    public static emit<N>(event: N, localId: any, ...args: N extends (...args: infer P) => void ? P : never) {
        const localEvents = this.events.get(event);
        if (localEvents === undefined) return;
        const localEventsCallbacks = localEvents.get(localId);
        if (localEventsCallbacks === undefined) return;

        for (let i = 0; i < localEventsCallbacks.length; i++) {
            localEventsCallbacks[i](...args);
        }
    }
}