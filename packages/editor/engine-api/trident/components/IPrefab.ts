export type SerializedComponent = { type: string } & Record<string, unknown>;

export interface IPrefab {
    name: string;
    type: string;
    components: SerializedComponent[];
    transform: SerializedComponent;
    children: IPrefab[];
};