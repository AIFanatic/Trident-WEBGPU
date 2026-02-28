export type SerializedComponent = { type: string } & Record<string, unknown>;

export interface IPrefab {
    assetPath: string;
    name: string;
    type: string;
    components: SerializedComponent[];
    transform: SerializedComponent;
    children: IPrefab[];
};