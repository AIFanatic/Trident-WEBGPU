export enum MODE {
    R,
    W,
    A
}

class _FileBrowser {
    private rootFolderHandle: FileSystemDirectoryHandle;

    constructor() {
        // @ts-ignore
        if (!window.showDirectoryPicker) {
            alert("FileSystem API not supported.");
            throw Error("FileSystem API not supported.")
        }
    }

    public init() {
        return new Promise((resolve: any, reject: any) => {
            window.showDirectoryPicker().then(folderHandle => {
                this.rootFolderHandle = folderHandle;
                resolve();
            })
            .catch(error => {
                reject(error);
            })
        })
    }

    public async opendir(path: string): Promise<FileSystemDirectoryHandle> {
        if (!this.rootFolderHandle) {
            alert("Trying to open a directory without initializing the File System.");
            return;
        };

        if (path == "") return this.rootFolderHandle;

        const pathArray = path.split("/");

        let currentDirectoryHandle = this.rootFolderHandle;

        for (const entry of pathArray) {
            if (entry == "") continue;
            currentDirectoryHandle = await currentDirectoryHandle.getDirectoryHandle(entry);
        }

        if (currentDirectoryHandle.kind == "directory" && currentDirectoryHandle.name == pathArray[pathArray.length-1]) {
            return currentDirectoryHandle;

        }

        throw Error(`Directory not found at "${path}"`);
    }

    public async readdir(folderHandle: FileSystemDirectoryHandle): Promise<(FileSystemDirectoryHandle | FileSystemFileHandle)[]> {
        let files: (FileSystemDirectoryHandle | FileSystemFileHandle)[] = [];

        const values = folderHandle.values();
        for await (const entry of values) {
            files.push(entry);
        }
        return files;
    }

    public mkdir(path: string): Promise<FileSystemDirectoryHandle> {
        const pathArray = path.split("/");
        const directoryName = pathArray[pathArray.length - 1];
        const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");

        return this.opendir(pathWithoutDirectory)
        .then(folderHandle => {
            return folderHandle.getDirectoryHandle(directoryName, {
                create: true
            })
        })
    }

    public rmdir(path: string) {
        const pathArray = path.split("/");
        const directoryName = pathArray[pathArray.length - 1];
        const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");

        this.opendir(pathWithoutDirectory)
        .then(async folderHandle => {
            const files = await this.readdir(folderHandle);
            for (let file of files) {
                if (file.kind == "directory" && file.name == directoryName) {
                    folderHandle.removeEntry(directoryName);
                    break;
                }
            }
        })
    }

    public fopen(path: string, mode: MODE): Promise<FileSystemFileHandle> {
        if (mode == MODE.A) {
            console.warn("MODE.A not implemented.");
        }

        const pathArray = path.split("/");
        const filename = pathArray[pathArray.length - 1];
        const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");

        return this.opendir(pathWithoutDirectory)
        .then(folderHandle => {
            return folderHandle.getFileHandle(filename, {
                create: mode == MODE.A || mode == MODE.W ? true : false
            })
        })
    }

    // TODO: Make more efficient by chunking
    public fread(file: FileSystemFileHandle, start: number, end?: number): Promise<Blob> {
        return file.getFile().then(value => {
            return value.slice(start, end);
            // return value.arrayBuffer()
            // .then(arrayBuffer => {
            //     return arrayBuffer.slice(start, end);
            // })
        })
    }

    // TODO: Do append
    public fwrite(file: FileSystemFileHandle, buf: BufferSource | Blob | string) {
        return file.createWritable()
        .then(writableStream => {
            writableStream.write(buf);
            return writableStream.close();
        })
    }

    public remove(path: string) {
        const pathArray = path.split("/");
        const filename = pathArray[pathArray.length - 1];
        const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");

        this.opendir(pathWithoutDirectory)
        .then(async folderHandle => {
            const files = await this.readdir(folderHandle);
            for (let file of files) {
                if (file.kind == "file" && file.name == filename) {
                    folderHandle.removeEntry(filename);
                    break;
                }
            }
        })
    }

    public is_directory(path: string): Promise<boolean> {
        return this.opendir(path)
        .then(folderHandle => {
            return true;
        })
        .catch(error => {
            return false;
        })
    }

    public exists(path: string): Promise<boolean> {
        return this.is_directory(path)
        .then(isDirectory => {
            if (isDirectory) {
                return true;
            }
            return this.fopen(path, MODE.R).then(file => {
                return true;
            }).catch(error => {
                return false;
            })
        })
    }
}

export const FileBrowser = new _FileBrowser();