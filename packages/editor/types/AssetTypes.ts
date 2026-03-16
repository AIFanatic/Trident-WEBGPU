export enum ITreeMapType {
    Folder,
    File
}

export interface ITreeMap<T> {
    name: string;
    id: string;
    isSelected: boolean;
    parent: string;
    type?: ITreeMapType;
    data?: T;
}

export interface FileData {
    file: FileSystemDirectoryHandle | FileSystemFileHandle;
    instance: any;
    path: string;
}

export interface ProjectTreeMap extends ITreeMap<FileData> {
    data?: FileData
}
