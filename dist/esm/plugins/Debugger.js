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
        this.container.style.display = "none";
    }
}
export const Debugger = new _Debugger();
//# sourceMappingURL=Debugger.js.map