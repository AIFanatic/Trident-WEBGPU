import { UIFolder } from "./ui/UIStats";

class _Debugger {
    public readonly ui: UIFolder;
    private container: HTMLDivElement;

    constructor() {
        this.container = document.createElement("div");
        this.container.classList.add("stats-panel");
        document.body.append(this.container);

        this.ui = new UIFolder(this.container, "Debugger");
        this.ui.Open();
    }

    public Enable() {
        this.container.style.display = "";
    }

    public Disable() {
        console.log("Running", this.container)
        this.container.style.display = "none";
    }

    static getInstance(): _Debugger {
        const g = globalThis as any;
        if (!g.__DebuggerInstance) {
            g.__DebuggerInstance = new _Debugger();
        }
        return g.__DebuggerInstance;
    }
}

export const Debugger = _Debugger.getInstance();