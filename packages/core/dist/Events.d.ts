export declare class EventSystem {
    private static events;
    static on<N>(event: N, callback: typeof event): void;
    static emit<N>(event: N, ...args: N extends (...args: infer P) => void ? P : never): void;
}
export declare class EventSystemLocal {
    private static events;
    static on<N>(event: N, localId: any, callback: typeof event): void;
    static emit<N>(event: N, localId: any, ...args: N extends (...args: infer P) => void ? P : never): void;
}
//# sourceMappingURL=Events.d.ts.map