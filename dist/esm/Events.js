export class EventSystem {
    static events = new Map();
    static on(event, callback) {
        const events = this.events.get(event) || [];
        events.push(callback);
        this.events.set(event, events);
    }
    static emit(event, ...args) {
        const callbacks = this.events.get(event);
        if (callbacks === undefined)
            return;
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](...args);
        }
    }
}
export class EventSystemLocal {
    static events = new Map();
    static on(event, localId, callback) {
        const localEvents = this.events.get(event) || new Map();
        const localEventsCallbacks = localEvents.get(localId) || [];
        localEventsCallbacks.push(callback);
        localEvents.set(localId, localEventsCallbacks);
        this.events.set(event, localEvents);
    }
    static emit(event, localId, ...args) {
        const localEvents = this.events.get(event);
        if (localEvents === undefined)
            return;
        const localEventsCallbacks = localEvents.get(localId);
        if (localEventsCallbacks === undefined)
            return;
        for (let i = 0; i < localEventsCallbacks.length; i++) {
            localEventsCallbacks[i](...args);
        }
    }
}
//# sourceMappingURL=Events.js.map