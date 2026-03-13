export interface IMaterial {
    name: string;
    params: {[key: string]: any};
    assetPath: string;

    SerializeAsset();
};