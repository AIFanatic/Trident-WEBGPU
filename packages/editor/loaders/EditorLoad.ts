import { Assets, Deserializer, GPU, Geometry, VertexAttribute, InterleavedVertexAttribute, IndexAttribute, PBRMaterial } from "@trident/core";
import { LoadScript } from "../loaders/ScriptLoader";

const typedArrayCtors: Record<string, any> = {
    float32: Float32Array, uint32: Uint32Array, uint16: Uint16Array, uint8: Uint8Array,
};

function deserializeAttribute(data: any): VertexAttribute | InterleavedVertexAttribute | IndexAttribute {
    const array = new (typedArrayCtors[data.arrayType])(data.array);

    let attr: VertexAttribute | InterleavedVertexAttribute | IndexAttribute;
    const attrType = data.attributeType || data.type;
    if (attrType === "@trident/core/Geometry/InterleavedVertexAttribute") {
        attr = new InterleavedVertexAttribute(array, data.stride);
    } else if (attrType === "@trident/core/Geometry/IndexAttribute") {
        attr = new IndexAttribute(array);
    } else {
        attr = new VertexAttribute(array);
    }
    attr.currentOffset = data.currentOffset;
    attr.currentSize = data.currentSize;
    return attr;
}

const coreLoad = Deserializer.Load.bind(Deserializer);

Deserializer.Load = async (assetPath: string, data?: any, expectedType?: any): Promise<any> => {
    const cached = Assets.GetInstance(assetPath);
    if (cached) return cached;

    const ext = assetPath.slice(assetPath.lastIndexOf(".") + 1);

    if (ext === "geometry") {
        const json = await Assets.Load(assetPath, "json") as any;
        const geometry = new Geometry();
        geometry.id = json.id;
        geometry.name = json.name;
        geometry.assetPath = assetPath;
        for (const entry of json.attributes) {
            const [name, attrData] = Array.isArray(entry) ? entry : [entry.name, entry];
            geometry.attributes.set(name, deserializeAttribute(attrData) as VertexAttribute | InterleavedVertexAttribute);
        }
        if (json.index) geometry.index = deserializeAttribute(json.index) as IndexAttribute;
        Assets.SetInstance(assetPath, geometry);
        return geometry;
    }

    if (ext === "material") {
        const json = await Assets.Load(assetPath, "json") as any;
        const materialType = json?.type;
        const material = materialType === PBRMaterial.type ? new PBRMaterial() : GPU.Material.Create(materialType);
        material.assetPath = assetPath;

        await Deserializer.deserializeFields(material.params, json?.params ?? {});

        if ((material as any).pendingShaderCreation) {
            await (material as any).pendingShaderCreation;
            material.params.isSkinned = material.params.isSkinned;
        }

        Assets.SetInstance(assetPath, material);
        return material;
    }

    if (ext === "ts") {
        return LoadScript(assetPath);
    }

    return coreLoad(assetPath, data, expectedType);
};
