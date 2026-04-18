import { FileBrowser } from "../helpers/FileBrowser";
import { DirectoryEvents, FileEvents } from "../Events";
import { FileData } from "../types/AssetTypes";
import { TridentAPI } from "../engine-api/trident/TridentAPI";

export async function DeleteAsset(selected: FileData): Promise<void> {
    if (!selected) return;

    if (selected.file instanceof FileSystemFileHandle) {
        FileBrowser.remove(selected.path);
        TridentAPI.EventSystem.emit(FileEvents.Deleted, selected.path, undefined);
    } else if (selected.file instanceof FileSystemDirectoryHandle) {
        FileBrowser.rmdir(selected.path);
        TridentAPI.EventSystem.emit(DirectoryEvents.Deleted, selected.path, undefined);
    }
}
