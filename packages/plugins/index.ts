
export * from "./OrbitControls";
export * from "./GLTF/GLTFLoader";
export * from "./TerrainGenerator/TerrainBuilder";
export * from "./SimplexNoise";

export * from "./DataBackedBuffer";

export * from "./ui/UIStats";

export * from "./Water/WaterPlugin";

export { LineRenderer } from "./LineRenderer";

export * from "./OBJLoader";
export * from "./RSMIndirectLighting";


export * from "./RSM";
export * from "./BilateralFilter";
export * from "./Debugger";

export * from "./TextureBlender";
export * from "./Upscaler";
export * from "./Bloom";

export * from "./HiZPass";
export * from "./meshlets_v2";

export * from "./PhysicsRapier";

export * from "./PostProcessing";
export * from "./VoxelGenerator";

export * from "./HDRParser";

export * from "./DebugTextureViewer";

export * from "./SpotLightHelper";
export * from "./DirectionalLightHelper";
export * from "./PointLightHelper";

export * from "./Atlas";

export * from "./Impostors/ImpostorMesh";

export * from "./ParticleSystem/ParticleSystem";

import { Component } from "@trident/core";
import { Water } from "./Water/WaterPlugin";
Component.Registry.set(Water.type, Water);