import { FileBrowser } from "../helpers/FileBrowser";
import { DirectoryEvents, EventSystem, FileEvents } from "../Events";
import { FileData } from "../types/AssetTypes";

export async function DeleteAsset(selected: FileData): Promise<void> {
    if (!selected) return;

    if (selected.file instanceof FileSystemFileHandle) {
        FileBrowser.remove(selected.path);
        EventSystem.emit(FileEvents.Deleted, selected.path, undefined);
    } else if (selected.file instanceof FileSystemDirectoryHandle) {
        FileBrowser.rmdir(selected.path);
        EventSystem.emit(DirectoryEvents.Deleted, selected.path, undefined);
    }
}
