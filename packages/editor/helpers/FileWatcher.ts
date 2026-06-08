import { TridentAPI } from "../engine-api/trident/TridentAPI";
import { DirectoryEvents, FileEvents } from "../Events";
import { FileBrowser } from "./FileBrowser";

export interface IWatchFile {
    path: string;
    handle: FileSystemFileHandle | FileSystemDirectoryHandle;
    lastModified: number;
}

export interface IWatchDirectory {
    path: string;
    handle: FileSystemDirectoryHandle;
    files: Map<string, IWatchFile>;
}

export class FileWatcher {
    private watches: Map<string, IWatchDirectory>;
    private updating = false;

    constructor() {
        this.watches = new Map();
        setInterval(() => this.update(), 2000);
    }

    public watch(directoryPath: string) {
        if (this.watches.has(directoryPath)) return;
        FileBrowser.opendir(directoryPath).then(directoryHandle => {
            this.watches.set(directoryPath, {
                path: directoryPath,
                handle: directoryHandle,
                files: new Map(),
            });
        }).catch(err => console.warn("error", err));
    }

    public unwatch(directoryPath: string) {
        this.watches.delete(directoryPath);
    }

    public getWatchMap(): Map<string, IWatchDirectory> {
        return this.watches;
    }

    private async update() {
        if (this.updating) return;
        this.updating = true;
        try {
            for (const [directoryPath, directoryWatch] of this.watches) {
                if (directoryPath[0] === ".") continue;

                let entries: (FileSystemFileHandle | FileSystemDirectoryHandle)[];
                try {
                    entries = await FileBrowser.readdir(directoryWatch.handle);
                } catch {
                    this.watches.delete(directoryPath);
                    TridentAPI.EventSystem.emit(DirectoryEvents.Deleted, directoryPath, directoryWatch.handle);
                    continue;
                }

                const current = new Set<string>();

                const fileReads = entries.filter(e => e.name[0] !== "." && e.kind === "file").map(async file => ({
                    file: file as FileSystemFileHandle,
                    handle: await (file as FileSystemFileHandle).getFile(),
                }));
                const fileResults = await Promise.all(fileReads);

                for (const { file, handle } of fileResults) {
                    const filePath = `${directoryPath}/${file.name}`;
                    current.add(filePath);

                    const stored = directoryWatch.files.get(filePath);
                    if (!stored) {
                        directoryWatch.files.set(filePath, { path: filePath, handle: file, lastModified: handle.lastModified });
                        TridentAPI.EventSystem.emit(FileEvents.Created, filePath, file);
                    } else if (stored.lastModified !== handle.lastModified) {
                        stored.lastModified = handle.lastModified;
                        TridentAPI.EventSystem.emit(FileEvents.Changed, filePath, file);
                    }
                }

                for (const entry of entries) {
                    if (entry.name[0] === "." || entry.kind !== "directory") continue;
                    const subPath = `${directoryPath}/${entry.name}`;
                    current.add(subPath);
                    if (!directoryWatch.files.has(subPath)) {
                        directoryWatch.files.set(subPath, { path: subPath, handle: entry, lastModified: 0 });
                        TridentAPI.EventSystem.emit(DirectoryEvents.Created, subPath, entry);
                    }
                }

                // Anything in cache not seen in current readdir = deleted.
                for (const [path, watchFile] of directoryWatch.files) {
                    if (current.has(path)) continue;
                    directoryWatch.files.delete(path);
                    if (watchFile.handle instanceof FileSystemFileHandle) {
                        TridentAPI.EventSystem.emit(FileEvents.Deleted, path, watchFile.handle);
                    }
                }
            }
        } finally {
            this.updating = false;
        }
    }
}