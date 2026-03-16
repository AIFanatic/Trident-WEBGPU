import { FileBrowser } from "../helpers/FileBrowser";
import { DirectoryEvents, EventSystem } from "../Events";

export async function CreateFolder(currentPath: string): Promise<void> {
    const path = `${currentPath}/New folder`;
    const handle = await FileBrowser.mkdir(path);
    EventSystem.emit(DirectoryEvents.Created, path, handle);
}
