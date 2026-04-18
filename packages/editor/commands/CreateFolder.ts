import { FileBrowser } from "../helpers/FileBrowser";
import { DirectoryEvents } from "../Events";
import { TridentAPI } from "../engine-api/trident/TridentAPI";

export async function CreateFolder(currentPath: string): Promise<void> {
    const path = `${currentPath}/New folder`;
    const handle = await FileBrowser.mkdir(path);
    TridentAPI.EventSystem.emit(DirectoryEvents.Created, path, handle);
}
