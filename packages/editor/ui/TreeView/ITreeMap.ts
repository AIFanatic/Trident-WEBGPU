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