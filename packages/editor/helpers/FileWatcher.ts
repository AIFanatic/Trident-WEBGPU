import { TridentAPI } from "../engine-api/trident/TridentAPI";
import { DirectoryEvents, FileEvents } from "../Events";
import { FileBrowser } from "./FileBrowser";


export interface IWatchFile {
    path: string;
    handle: FileSystemFileHandle | FileSystemDirectoryHandle;
    lastModified: number;
};

export interface IWatchDirectory {
    path: string;
    handle: FileSystemDirectoryHandle;
    files: Map<string, IWatchFile>;
};


export class FileWatcher {
    private watches: Map<string, IWatchDirectory>;

    constructor() {
        this.watches = new Map();

        setInterval(() => this.update(), 500);
    }

    public watch(directoryPath: string) {
        FileBrowser.opendir(directoryPath).then(directoryHandle => {
            this.watches.set(directoryPath, {
                path: directoryPath,
                handle: directoryHandle,
                files: new Map()
            });
        })
            .catch(error => {
                console.warn("error", error)
            })
    }

    public unwatch(directoryPath: string) {
        if (this.watches.has(directoryPath)) {
            this.watches.delete(directoryPath);
        }
    }

    public getWatchMap(): Map<string, IWatchDirectory> {
        return this.watches;
    }

    private async update() {
        for (const [directoryPath, directoryWatch] of this.watches) {
            if (directoryPath[0] == ".") continue;

            const directoryPathExists = await FileBrowser.exists(directoryPath);
            if (!directoryPathExists) {
                this.watches.delete(directoryPath);
                TridentAPI.EventSystem.emit(DirectoryEvents.Deleted, directoryPath, directoryWatch.handle);
                continue;
            }

            for (let watchFilesPair of directoryWatch.files) {
                const watchFilePath = watchFilesPair[0];
                const watchFile = watchFilesPair[1];

                const fileExists = await FileBrowser.exists(watchFilePath);
                if (!fileExists) {
                    directoryWatch.files.delete(watchFile.path);
                    if (watchFile.handle instanceof FileSystemFileHandle) {
                        TridentAPI.EventSystem.emit(FileEvents.Deleted, watchFile.path, watchFile.handle);
                    }
                }
            }

            const files = await FileBrowser.readdir(directoryWatch.handle);
            for (let file of files) {
                if (file.name[0] == ".") continue;

                if (file.kind == "file") {
                    const fileHandle = await file.getFile();
                    const filePath = directoryPath + "/" + file.name;

                    if (!directoryWatch.files.has(filePath)) {
                        directoryWatch.files.set(filePath, {
                            path: filePath,
                            handle: file,
                            lastModified: fileHandle.lastModified
                        })
                        TridentAPI.EventSystem.emit(FileEvents.Created, filePath, file as FileSystemFileHandle);
                    }
                    else {
                        const storedFile = directoryWatch.files.get(filePath);
                        if (storedFile.lastModified != fileHandle.lastModified) {
                            storedFile.lastModified = fileHandle.lastModified;
                            TridentAPI.EventSystem.emit(FileEvents.Changed, filePath, file as FileSystemFileHandle);
                        }
                    }
                }
                else if (file.kind == "directory") {
                    const directoryDirectoryPath = directoryPath + "/" + file.name;
                    if (!directoryWatch.files.has(directoryDirectoryPath)) {
                        directoryWatch.files.set(directoryDirectoryPath, {
                            path: directoryDirectoryPath,
                            handle: file,
                            lastModified: 0
                        })
                        TridentAPI.EventSystem.emit(DirectoryEvents.Created, directoryDirectoryPath, file);
                    }
                }
            }
        }
    }
}