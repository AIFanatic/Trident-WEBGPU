import { UIFolder } from "./ui/UIStats";

class _Debugger {
    public readonly ui: UIFolder;

    constructor() {
        const container = document.createElement("div");
        container.classList.add("stats-panel");
        document.body.append(container);

        this.ui = new UIFolder(container, "Debugger");
        this.ui.Open();
    }
}

export const Debugger = new _Debugger();