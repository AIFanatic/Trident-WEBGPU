import { Debugger } from "./plugins/Debugger";
import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat } from "./plugins/ui/UIStats";

class _EngineDebug {
    public readonly componentUpdate: UITextStat;

    private engineFolder: UIFolder;

    constructor() {
        this.engineFolder = new UIFolder(Debugger.ui, "Engine");
        this.engineFolder.Open();

        this.componentUpdate = new UITextStat(this.engineFolder, "Component update", 0, 2, "", true);
    }
}

export const EngineDebug = new _EngineDebug();