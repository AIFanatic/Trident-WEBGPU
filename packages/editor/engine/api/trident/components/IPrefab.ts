export interface IPrefab {
    assetPath?: string;
    name: string;
    id?: string;
    components: any[];
    transform: any;
    children: IPrefab[];
    data: any;
    traverse(fn: (prefab: IPrefab) => void): void;
};