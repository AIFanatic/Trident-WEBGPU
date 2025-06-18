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
        this.container.style.display = "none";
    }
}

export const Debugger = new _Debugger();