import { UIFolder } from "./ui/UIStats";
class _Debugger {
    ui;
    container;
    constructor() {
        this.container = document.createElement("div");
        this.container.classList.add("stats-panel");
        document.body.append(this.container);
        this.ui = new UIFolder(this.container, "Debugger");
        this.ui.Open();
    }
    Enable() {
        this.container.style.display = "";
    }
    Disable() {
        console.log("Running", this.container);
        this.container.style.display = "none";
    }
    static getInstance() {
        const g = globalThis;
        if (!g.__DebuggerInstance) {
            g.__DebuggerInstance = new _Debugger();
        }
        return g.__DebuggerInstance;
    }
}
export const Debugger = _Debugger.getInstance();
