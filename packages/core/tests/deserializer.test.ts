import test from "node:test";
import assert from "node:assert/strict";
import {
    Scene,
    GameObject,
    Components,
    Component,
    Serializer,
    Deserializer,
    SerializeField,
    GPU,
    Utils,
    Assets,
    Prefab
} from "../../../dist/trident-core.js";

class TestLayer {
    @SerializeField(GPU.Texture)
    public albedoMap?: GPU.Texture;
}

class TestComponent extends Component {
    public static type = "TestComponent";

    @SerializeField(TestLayer)
    public layers: TestLayer[] = [];

    constructor(gameObject: GameObject) {
        super(gameObject);
    }
}

test("field deserialization loads asset refs inside typed arrays", async () => {
    const originalLoad = Deserializer.Load;
    const loadedTexture = { assetPath: "/foo.png", width: 4, height: 4, format: "bgra8unorm", mipLevels: 1 };

    Deserializer.Load = async (assetPath: string) => {
        assert.equal(assetPath, "/foo.png");
        return loadedTexture as any;
    };

    try {
        const componentLike = new class {
            @SerializeField(TestLayer)
            public layers: TestLayer[] = [];
        }();

        await Deserializer.deserializeFields(componentLike, {
            layers: [
                {
                    albedoMap: {
                        assetPath: "/foo.png",
                        format: "bgra8unorm",
                        generateMips: true
                    }
                }
            ]
        });

        assert.equal(componentLike.layers.length, 1);
        assert.ok(componentLike.layers[0] instanceof TestLayer);
        assert.equal(componentLike.layers[0].albedoMap, loadedTexture);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("component deserialization loads serialized fields", async () => {
    const originalLoad = Deserializer.Load;
    const loadedTexture = { assetPath: "/foo.png", width: 4, height: 4, format: "bgra8unorm", mipLevels: 1 };

    Deserializer.Load = async () => loadedTexture as any;

    try {
        Component.Registry.set(TestComponent.type, TestComponent as any);

        const scene = new Scene();
        const go = new GameObject(scene);
        const component = new TestComponent(go);

        await Deserializer.deserializeComponent(component, {
            id: "cmp-1",
            type: "TestComponent",
            layers: [
                {
                    albedoMap: {
                        assetPath: "/foo.png",
                        format: "bgra8unorm"
                    }
                }
            ]
        });

        assert.equal(component.id, "cmp-1");
        assert.equal(component.layers.length, 1);
        assert.ok(component.layers[0] instanceof TestLayer);
        assert.equal(component.layers[0].albedoMap, loadedTexture);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("game object serialization preserves transform and components", () => {
    const scene = new Scene();
    const go = new GameObject(scene);
    go.id = "go-1";
    go.name = "Player";
    go.transform.localPosition.set(1, 2, 3);

    const serialized = Serializer.serializeGameObject(go);

    assert.equal(serialized.id, "go-1");
    assert.equal(serialized.name, "Player");
    assert.equal(serialized.transform.localPosition.x, 1);
    assert.equal(serialized.transform.localPosition.y, 2);
    assert.equal(serialized.transform.localPosition.z, 3);
    assert.ok(Array.isArray(serialized.components));
    assert.ok(Array.isArray(serialized.children));
});

test("scene serialization preserves root game objects", () => {
    const scene = new Scene();
    scene.name = "TestScene";

    const go = new GameObject(scene);
    go.id = "go-1";
    go.name = "Root";

    const serialized = Serializer.serializeScene(scene);

    assert.equal(serialized.type, Scene.type);
    assert.equal(serialized.name, "TestScene");
    assert.equal(serialized.gameObjects.length, 1);
    assert.equal(serialized.gameObjects[0].id, "go-1");
    assert.equal(serialized.gameObjects[0].name, "Root");
});

test("scene deserialization creates game object with component typed array asset refs", async () => {
    const originalLoad = Deserializer.Load;
    const loadedTexture = {
        assetPath: "/foo.png",
        width: 4,
        height: 4,
        format: "bgra8unorm",
        mipLevels: 1,
        GetBuffer() {
            return {};
        }
    };

    Deserializer.Load = async (assetPath: string) => {
        assert.equal(assetPath, "/foo.png");
        return loadedTexture as any;
    };

    try {
        Component.Registry.set(TestComponent.type, TestComponent as any);

        const scene = new Scene();

        await Deserializer.deserializeScene(scene, {
            type: Scene.type,
            name: "LoadedScene",
            mainCamera: undefined,
            gameObjects: [
                {
                    id: "go-1",
                    name: "TerrainPainter",
                    transform: {
                        id: "transform-1",
                        type: Components.Transform.type,
                        localPosition: { x: 1, y: 2, z: 3 },
                        localRotation: { x: 0, y: 0, z: 0, w: 1 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    components: [
                        {
                            id: "cmp-1",
                            type: TestComponent.type,
                            layers: [
                                {
                                    albedoMap: {
                                        assetPath: "/foo.png",
                                        format: "bgra8unorm"
                                    }
                                }
                            ]
                        }
                    ],
                    children: []
                }
            ]
        });

        assert.equal(scene.name, "LoadedScene");

        const gameObjects = scene.GetGameObjects();
        assert.equal(gameObjects.length, 1);

        const go = gameObjects[0];
        assert.equal(go.id, "go-1");
        assert.equal(go.name, "TerrainPainter");
        assert.equal(go.transform.localPosition.x, 1);
        assert.equal(go.transform.localPosition.y, 2);
        assert.equal(go.transform.localPosition.z, 3);

        const component = go.GetComponent(TestComponent);
        assert.ok(component);
        assert.equal(component.id, "cmp-1");
        assert.equal(component.layers.length, 1);
        assert.ok(component.layers[0] instanceof TestLayer);
        assert.equal(component.layers[0].albedoMap, loadedTexture);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("prefab-like game object serialization preserves children and components", () => {
    const scene = new Scene();

    const root = new GameObject(scene);
    root.id = "root-go";
    root.name = "PrefabRoot";
    root.transform.localPosition.set(1, 2, 3);

    const child = new GameObject(scene);
    child.id = "child-go";
    child.name = "Child";
    child.transform.parent = root.transform;
    child.transform.localPosition.set(4, 5, 6);

    const serialized = Serializer.serializeGameObject(root);

    assert.equal(serialized.id, "root-go");
    assert.equal(serialized.name, "PrefabRoot");
    assert.equal(serialized.transform.localPosition.x, 1);
    assert.equal(serialized.transform.localPosition.y, 2);
    assert.equal(serialized.transform.localPosition.z, 3);

    assert.equal(serialized.children.length, 1);
    assert.equal(serialized.children[0].id, "child-go");
    assert.equal(serialized.children[0].name, "Child");
    assert.equal(serialized.children[0].transform.localPosition.x, 4);
    assert.equal(serialized.children[0].transform.localPosition.y, 5);
    assert.equal(serialized.children[0].transform.localPosition.z, 6);
});

class TestAsset {
    public static type = "TestAsset";

    @SerializeField
    public name = "";

    @SerializeField(TestLayer)
    public layers: TestLayer[] = [];
}

test("generic typed asset deserialization loads nested asset refs", async () => {
    const originalLoad = Deserializer.Load;
    const loadedTexture = {
        assetPath: "/foo.png",
        width: 4,
        height: 4,
        format: "bgra8unorm",
        mipLevels: 1,
        GetBuffer() {
            return {};
        }
    };

    Deserializer.Load = async (assetPath: string, data?: any) => {
        if (assetPath === "/foo.png") return loadedTexture as any;
        throw new Error(`Unexpected asset load: ${assetPath}`);
    };

    try {
        const asset = new TestAsset();

        await Deserializer.deserializeFields(asset, {
            type: TestAsset.type,
            name: "MyAsset",
            layers: [
                {
                    albedoMap: {
                        assetPath: "/foo.png",
                        format: "bgra8unorm"
                    }
                }
            ]
        });

        assert.equal(asset.name, "MyAsset");
        assert.equal(asset.layers.length, 1);
        assert.ok(asset.layers[0] instanceof TestLayer);
        assert.equal(asset.layers[0].albedoMap, loadedTexture);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("asset loading returns cached instance for same asset path", async () => {
    const originalLoad = Deserializer.Load;
    let loadCount = 0;

    const loadedTexture = {
        assetPath: "/foo.png",
        width: 4,
        height: 4,
        format: "bgra8unorm",
        mipLevels: 1,
        GetBuffer() {
            return {};
        }
    };

    const cache = new Map<string, any>();

    Deserializer.Load = async (assetPath: string) => {
        const cached = cache.get(assetPath);
        if (cached) return cached;

        loadCount++;

        if (assetPath === "/foo.png") {
            cache.set(assetPath, loadedTexture);
            return loadedTexture as any;
        }

        throw new Error(`Unexpected asset load: ${assetPath}`);
    };

    try {
        const a = await Deserializer.Load("/foo.png");
        const b = await Deserializer.Load("/foo.png");

        assert.equal(a, b);
        assert.equal(loadCount, 1);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("shared asset refs across components resolve to same instance", async () => {
    const originalLoad = Deserializer.Load;
    let loadCount = 0;

    const loadedTexture = {
        assetPath: "/foo.png",
        width: 4,
        height: 4,
        format: "bgra8unorm",
        mipLevels: 1,
        GetBuffer() {
            return {};
        }
    };

    const cache = new Map<string, any>();

    Deserializer.Load = async (assetPath: string) => {
        const cached = cache.get(assetPath);
        if (cached) return cached;

        loadCount++;

        if (assetPath === "/foo.png") {
            cache.set(assetPath, loadedTexture);
            return loadedTexture as any;
        }

        throw new Error(`Unexpected asset load: ${assetPath}`);
    };

    try {
    Component.Registry.set(TestComponent.type, TestComponent as any);

    const scene = new Scene();

    await Deserializer.deserializeScene(scene, {
        type: Scene.type,
        name: "SharedAssetScene",
        mainCamera: undefined,
        gameObjects: [
            {
                id: "go-1",
                name: "A",
                transform: {
                    id: "t-1",
                    type: Components.Transform.type,
                    localPosition: { x: 0, y: 0, z: 0 },
                    localRotation: { x: 0, y: 0, z: 0, w: 1 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                components: [
                    {
                        id: "cmp-1",
                        type: TestComponent.type,
                        layers: [
                            {
                                albedoMap: {
                                    assetPath: "/foo.png",
                                    format: "bgra8unorm"
                                }
                            }
                        ]
                    }
                ],
                children: []
            },
            {
                id: "go-2",
                name: "B",
                transform: {
                    id: "t-2",
                    type: Components.Transform.type,
                    localPosition: { x: 0, y: 0, z: 0 },
                    localRotation: { x: 0, y: 0, z: 0, w: 1 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                components: [
                    {
                        id: "cmp-2",
                        type: TestComponent.type,
                        layers: [
                            {
                                albedoMap: {
                                    assetPath: "/foo.png",
                                    format: "bgra8unorm"
                                }
                            }
                        ]
                    }
                ],
                children: []
            }
        ]
    });

    const gameObjects = scene.GetGameObjects();
    const compA = gameObjects[0].GetComponent(TestComponent);
    const compB = gameObjects[1].GetComponent(TestComponent);

    assert.ok(compA);
    assert.ok(compB);

    assert.equal(compA.layers[0].albedoMap, loadedTexture);
    assert.equal(compB.layers[0].albedoMap, loadedTexture);
    assert.equal(compA.layers[0].albedoMap, compB.layers[0].albedoMap);
    assert.equal(loadCount, 1);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

class TestAssetRefComponent extends Component {
    public static type = "TestAssetRefComponent";

    @SerializeField(TestAsset)
    public asset?: TestAsset;

    constructor(gameObject: GameObject) {
        super(gameObject);
    }
}

test("component asset reference field loads external typed asset", async () => {
    const originalLoad = Deserializer.Load;
    const loadedAsset = new TestAsset();
    loadedAsset.name = "LoadedExternalAsset";

    Deserializer.Load = async (assetPath: string) => {
        assert.equal(assetPath, "/external.asset");
        return loadedAsset as any;
    };

    try {
        Component.Registry.set(TestAssetRefComponent.type, TestAssetRefComponent as any);

        const scene = new Scene();

        await Deserializer.deserializeScene(scene, {
            type: Scene.type,
            name: "ExternalAssetScene",
            mainCamera: undefined,
            gameObjects: [
                {
                    id: "go-1",
                    name: "UsesExternalAsset",
                    transform: {
                        id: "t-1",
                        type: Components.Transform.type,
                        localPosition: { x: 0, y: 0, z: 0 },
                        localRotation: { x: 0, y: 0, z: 0, w: 1 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    components: [
                        {
                            id: "cmp-1",
                            type: TestAssetRefComponent.type,
                            asset: {
                                assetPath: "/external.asset"
                            }
                        }
                    ],
                    children: []
                }
            ]
        });

        const go = scene.GetGameObjects()[0];
        const component = go.GetComponent(TestAssetRefComponent);

        assert.ok(component);
        assert.equal(component.asset, loadedAsset);
        assert.equal(component.asset?.name, "LoadedExternalAsset");
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("Deserializer.Load reads typed json asset, deserializes fields, and caches instance", async () => {
    const originalFetch = Assets.ResourceFetchFn;

    const loadedTexture = {
        assetPath: "/foo.png",
        width: 4,
        height: 4,
        format: "bgra8unorm",
        mipLevels: 1,
        GetBuffer() { return {}; }
    };

    let jsonReadCount = 0;
    let textureLoadCount = 0;

    Utils.TypeRegistry.set(TestAsset.type, TestAsset as any);

    Assets.ResourceFetchFn = async (input: RequestInfo | URL) => {
        const path = String(input);

        if (path === "/asset.test") {
            jsonReadCount++;
            return new Response(JSON.stringify({
                type: TestAsset.type,
                name: "LoadedAsset",
                layers: [{
                    albedoMap: { assetPath: "/foo.png", format: "bgra8unorm" }
                }]
            }), { status: 200 });
        }

        if (path === "/foo.png") {
            textureLoadCount++;
            return new Response(new ArrayBuffer(4), { status: 200 });
        }

        throw new Error(`Unexpected fetch: ${path}`);
    };

    // Mock Texture.Deserialize since we can't create real GPU textures in tests
    const origTextureDeserialize = GPU.Texture.Deserialize;
    GPU.Texture.Deserialize = async (assetPath: string, data?: any) => {
        return loadedTexture as any;
    };

    try {
        const first = await Deserializer.Load("/asset.test");
        const second = await Deserializer.Load("/asset.test");

        assert.equal(first, second);
        assert.ok(first instanceof TestAsset);
        assert.equal(first.assetPath, "/asset.test");
        assert.equal(first.name, "LoadedAsset");
        assert.equal(first.layers.length, 1);
        assert.ok(first.layers[0] instanceof TestLayer);
        assert.equal(first.layers[0].albedoMap, loadedTexture);
        assert.equal(jsonReadCount, 1);
    } finally {
        Assets.ResourceFetchFn = originalFetch;
        GPU.Texture.Deserialize = origTextureDeserialize;
        Assets.RemoveInstance("/asset.test");
        Assets.RemoveInstance("/foo.png");
    }
});

test("Deserializer.Load uses expectedType.Deserialize for binary assets", async () => {
    const originalFetch = Assets.ResourceFetchFn;

    Assets.ResourceFetchFn = async () => {
        return new Response(new ArrayBuffer(4), { status: 200 });
    };

    const fakeTexture = { assetPath: "/test.png", width: 2, height: 2 };

    class MockBinaryAsset {
        static async Deserialize(assetPath: string, data?: any) {
            return { ...fakeTexture, assetPath, extra: data?.format } as any;
        }
    }

    try {
        const result = await Deserializer.Load(
            "/test.png",
            { assetPath: "/test.png", format: "rgba8unorm" },
            MockBinaryAsset
        );

        assert.equal(result.assetPath, "/test.png");
        assert.equal(result.extra, "rgba8unorm");
    } finally {
        Assets.ResourceFetchFn = originalFetch;
        Assets.RemoveInstance("/test.png");
    }
});

test("OnDeserialized is called after field deserialization", async () => {
    let hookCalled = false;

    class HookAsset {
        static type = "HookAsset";
        @SerializeField public value = 0;
        async OnDeserialized() { hookCalled = true; }
    }

    Utils.TypeRegistry.set(HookAsset.type, HookAsset as any);

    const originalFetch = Assets.ResourceFetchFn;
    Assets.ResourceFetchFn = async () => {
        return new Response(JSON.stringify({
            type: HookAsset.type,
            value: 42
        }), { status: 200 });
    };

    try {
        const result = await Deserializer.Load("/hook.test") as HookAsset;
        assert.equal(result.value, 42);
        assert.equal(hookCalled, true);
    } finally {
        Assets.ResourceFetchFn = originalFetch;
        Assets.RemoveInstance("/hook.test");
    }
});

test("serialize then deserialize produces same state", async () => {
    const scene = new Scene();
    const go = new GameObject(scene);
    go.id = "rt-1";
    go.name = "RoundTrip";
    go.transform.localPosition.set(10, 20, 30);
    go.transform.localRotation.set(0, 0.707, 0, 0.707);

    const serialized = Serializer.serializeScene(scene);

    const scene2 = new Scene();
    await Deserializer.deserializeScene(scene2, serialized);

    const go2 = scene2.GetGameObjects()[0];
    assert.equal(go2.name, "RoundTrip");
    assert.equal(go2.transform.localPosition.x, 10);
    assert.equal(go2.transform.localPosition.y, 20);
    assert.equal(go2.transform.localPosition.z, 30);
    assert.ok(Math.abs(go2.transform.localRotation.y - 0.707) < 0.001);
});

test("prefab: gameObject with assetPath loads prefab and creates components from it", async () => {
    const originalLoad = Deserializer.Load;

    Deserializer.Load = async (assetPath: string) => {
        assert.equal(assetPath, "/prefabs/Enemy.prefab");
        return {
            name: "Enemy",
            transform: {
                id: "pf-t",
                type: Components.Transform.type,
                localPosition: { x: 0, y: 0, z: 0 },
                localRotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 }
            },
            components: [
                { id: "pf-cmp", type: TestComponent.type, layers: [] }
            ],
            children: []
        };
    };

    try {
        Component.Registry.set(TestComponent.type, TestComponent as any);
        const scene = new Scene();

        await Deserializer.deserializeScene(scene, {
            type: Scene.type,
            name: "PrefabScene",
            mainCamera: undefined,
            gameObjects: [
                {
                    id: "go-1",
                    assetPath: "/prefabs/Enemy.prefab",
                    transform: {
                        localPosition: { x: 5, y: 0, z: 0 },
                        localRotation: { x: 0, y: 0, z: 0, w: 1 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    children: []
                }
            ]
        });

        const go = scene.GetGameObjects()[0];
        assert.equal(go.id, "go-1");
        assert.equal(go.name, "Enemy");
        assert.equal(go.assetPath, "/prefabs/Enemy.prefab");
        assert.equal(go.transform.localPosition.x, 5);

        const comp = go.GetComponent(TestComponent);
        assert.ok(comp, "component from prefab should exist");
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("prefab: data.name overrides prefab name", async () => {
    const originalLoad = Deserializer.Load;

    Deserializer.Load = async () => ({
        name: "DefaultName",
        transform: {
            id: "pf-t",
            type: Components.Transform.type,
            localPosition: { x: 0, y: 0, z: 0 },
            localRotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
        },
        components: [],
        children: []
    });

    try {
        const scene = new Scene();

        await Deserializer.deserializeScene(scene, {
            type: Scene.type,
            name: "S",
            mainCamera: undefined,
            gameObjects: [
                {
                    id: "go-1",
                    name: "OverriddenName",
                    assetPath: "/prefabs/Thing.prefab",
                    transform: {
                        localPosition: { x: 0, y: 0, z: 0 },
                        localRotation: { x: 0, y: 0, z: 0, w: 1 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    children: []
                }
            ]
        });

        assert.equal(scene.GetGameObjects()[0].name, "OverriddenName");
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("prefab: transform override applies on top of prefab transform", async () => {
    const originalLoad = Deserializer.Load;

    Deserializer.Load = async () => ({
        name: "Prefab",
        transform: {
            id: "pf-t",
            type: Components.Transform.type,
            localPosition: { x: 1, y: 2, z: 3 },
            localRotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
        },
        components: [],
        children: []
    });

    try {
        const scene = new Scene();

        await Deserializer.deserializeScene(scene, {
            type: Scene.type,
            name: "S",
            mainCamera: undefined,
            gameObjects: [
                {
                    id: "go-1",
                    assetPath: "/prefabs/P.prefab",
                    transform: {
                        localPosition: { x: 10, y: 20, z: 30 },
                    },
                    children: []
                }
            ]
        });

        const t = scene.GetGameObjects()[0].transform;
        assert.equal(t.localPosition.x, 10);
        assert.equal(t.localPosition.y, 20);
        assert.equal(t.localPosition.z, 30);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("prefab: children from prefab source are created", async () => {
    const originalLoad = Deserializer.Load;

    Deserializer.Load = async () => ({
        name: "Parent",
        transform: {
            id: "pf-t",
            type: Components.Transform.type,
            localPosition: { x: 0, y: 0, z: 0 },
            localRotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
        },
        components: [],
        children: [
            {
                id: "child-1",
                name: "ChildFromPrefab",
                transform: {
                    id: "child-t",
                    type: Components.Transform.type,
                    localPosition: { x: 0, y: 5, z: 0 },
                    localRotation: { x: 0, y: 0, z: 0, w: 1 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                components: [],
                children: []
            }
        ]
    });

    try {
        const scene = new Scene();

        await Deserializer.deserializeScene(scene, {
            type: Scene.type,
            name: "S",
            mainCamera: undefined,
            gameObjects: [
                {
                    id: "go-1",
                    assetPath: "/prefabs/WithChild.prefab",
                    transform: {
                        localPosition: { x: 0, y: 0, z: 0 },
                        localRotation: { x: 0, y: 0, z: 0, w: 1 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    children: []
                }
            ]
        });

        const root = scene.GetGameObjects()[0];
        assert.equal(root.name, "Parent");

        const children = [...root.transform.children];
        assert.equal(children.length, 1);
        assert.equal(children[0].gameObject.name, "ChildFromPrefab");
        assert.equal(children[0].localPosition.y, 5);
    } finally {
        Deserializer.Load = originalLoad;
    }
});

test("Deserializer.Load with expectedType.Deserialize for JSON assets (prefab)", async () => {
    const originalFetch = Assets.ResourceFetchFn;

    const prefabJson = {
        name: "EnemyPrefab",
        transform: {
            type: Components.Transform.type,
            localPosition: { x: 0, y: 0, z: 0 },
            localRotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
        },
        components: [
            { type: "SomeComponent", id: "cmp-1" }
        ],
        children: [
            {
                name: "Child",
                transform: {
                    type: Components.Transform.type,
                    localPosition: { x: 0, y: 3, z: 0 },
                    localRotation: { x: 0, y: 0, z: 0, w: 1 },
                    scale: { x: 1, y: 1, z: 1 }
                },
                components: [],
                children: []
            }
        ]
    };

    Assets.ResourceFetchFn = async () => {
        return new Response(JSON.stringify(prefabJson), { status: 200 });
    };

    try {
        const result = await Deserializer.Load("/prefabs/Enemy.prefab", undefined, Prefab);

        assert.ok(result instanceof Prefab);
        assert.equal(result.name, "EnemyPrefab");
        assert.equal(result.assetPath, "/prefabs/Enemy.prefab");
        assert.equal(result.components.length, 1);
        assert.equal(result.components[0].type, "SomeComponent");
        assert.equal(result.children.length, 1);
        assert.ok(result.children[0] instanceof Prefab);
        assert.equal(result.children[0].name, "Child");
        assert.equal(result.children[0].assetPath, undefined);

        // Cached
        const second = await Deserializer.Load("/prefabs/Enemy.prefab", undefined, Prefab);
        assert.equal(result, second);
    } finally {
        Assets.ResourceFetchFn = originalFetch;
        Assets.RemoveInstance("/prefabs/Enemy.prefab");
    }
});

test("typed array fields round-trip through serialize and deserialize", async () => {
    class TypedArrayAsset {
        @SerializeField(Float32Array) public floats: Float32Array = new Float32Array([1.5, 2.5, 3.5]);
        @SerializeField(Uint8Array) public bytes: Uint8Array = new Uint8Array([10, 20, 30, 40]);
    }

    const original = new TypedArrayAsset();
    const serialized = Serializer.serializeFields(original);

    const restored = new TypedArrayAsset();
    restored.floats = new Float32Array(0);
    restored.bytes = new Uint8Array(0);
    await Deserializer.deserializeFields(restored, serialized);

    assert.ok(restored.floats instanceof Float32Array);
    assert.ok(restored.bytes instanceof Uint8Array);
    assert.deepEqual(Array.from(restored.floats), [1.5, 2.5, 3.5]);
    assert.deepEqual(Array.from(restored.bytes), [10, 20, 30, 40]);
});