interface IDragEvent {
    data: any;
};

class _ExtendedDataTransfer {
    private data: IDragEvent;

    constructor() {
        this.data = null;
    }

    public set(data: IDragEvent) {
        this.data = data;
    }

    public get() {
        return this.data;
    }

    public remove(e: DragEvent) {
        this.data = null;
    }
}

export const ExtendedDataTransfer = new _ExtendedDataTransfer();