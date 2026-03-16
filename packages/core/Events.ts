export class EventSystem {
    private static events: Map<any, Function[]> = new Map();

    public static on<N>(event: N, callback: typeof event) {
        const events = this.events.get(event) || [];
        events.push(callback as Function);
        this.events.set(event, events);
    }

    public static off<N>(event: N, callback: typeof event) {
        const events = this.events.get(event);
        if (!events) return;
        const filtered = events.filter(fn => fn !== callback);
        if (filtered.length === 0) this.events.delete(event);
        else this.events.set(event, filtered);
    }

    public static once<N>(event: N, callback: typeof event) {
        const onceCallback = ((...args: any[]) => {
            this.off(event, onceCallback as typeof event);
            (callback as Function)(...args);
        }) as typeof event;

        this.on(event, onceCallback);
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

    public static off<N>(event: N, localId: any, callback: typeof event) {
        const localEvents = this.events.get(event);
        if (!localEvents) return;

        const localEventsCallbacks = localEvents.get(localId);
        if (!localEventsCallbacks) return;

        const filtered = localEventsCallbacks.filter(fn => fn !== callback);
        if (filtered.length === 0) {
            localEvents.delete(localId);
            if (localEvents.size === 0) this.events.delete(event);
        } else {
            localEvents.set(localId, filtered);
        }
    }

    public static once<N>(event: N, localId: any, callback: typeof event) {
        const onceCallback = ((...args: any[]) => {
            this.off(event, localId, onceCallback as typeof event);
            (callback as Function)(...args);
        }) as typeof event;

        this.on(event, localId, onceCallback);
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
