import { Debugger } from "./plugins/Debugger";
import { UIFolder, UITextStat } from "./plugins/ui/UIStats";
class _EngineDebug {
    componentUpdate;
    engineFolder;
    constructor() {
        this.engineFolder = new UIFolder(Debugger.ui, "Engine");
        this.engineFolder.Open();
        this.componentUpdate = new UITextStat(this.engineFolder, "Component update", 0, 2, "", true);
    }
}
export const EngineDebug = new _EngineDebug();
//# sourceMappingURL=EngineDebug.js.map