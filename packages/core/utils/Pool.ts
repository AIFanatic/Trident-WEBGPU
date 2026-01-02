export class Pool<T> {
    private items: (T | undefined)[] = [];
    private free: number[] = [];

    /** Add an item, return its ID */
    add(value: T): number {
        if (this.free.length > 0) {
            const id = this.free.pop()!;
            this.items[id] = value;
            return id;
        }

        const id = this.items.length;
        this.items.push(value);
        return id;
    }

    /** Get item by ID (undefined if removed) */
    get(id: number): T | undefined {
        return this.items[id];
    }

    /** Replace item at ID */
    set(id: number, value: T): void {
        this.items[id] = value;
    }

    /** Remove item and free its ID */
    remove(id: number): void {
        if (this.items[id] !== undefined) {
            this.items[id] = undefined;
            this.free.push(id);
        }
    }
}