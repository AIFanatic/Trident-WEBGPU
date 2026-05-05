import { IComponent } from "./engine-api/trident/components/IComponent";
import { IGameObject } from "./engine-api/trident/components/IGameObject";
import { IScene } from "./engine-api/trident/IScene";

export class ComponentEvents {
    public static Created = (gameObject: IGameObject, component: IComponent) => { };
    public static Deleted = (gameObject: IGameObject, component: IComponent) => { };
}

export class GameObjectEvents {
    public static Selected = (gameObject: IGameObject) => { };
    public static Created = (gameObject: IGameObject) => { };
    public static Deleted = (gameObject: IGameObject) => { };
    public static Changed = (gameObject: IGameObject) => { };
}

export class ProjectEvents {
    public static Opened = () => { };
}

export class FileEvents {
    public static Created = (path: string, handle: FileSystemFileHandle) => { };
    public static Changed = (path: string, handle: FileSystemFileHandle) => { };
    public static Deleted = (path: string, handle: FileSystemFileHandle) => { };
}

export class DirectoryEvents {
    public static Created = (path: string, handle: FileSystemDirectoryHandle) => { };
    public static Deleted = (path: string, handle: FileSystemDirectoryHandle) => { };
}

export class SceneEvents {
    public static Loaded = (scene: IScene) => { };
    public static Saved = (scene: IScene) => { };
}

export class LayoutAssetEvents {
    public static Selected = (instance: any) => { };
    public static RequestSaveAsset = (asset: { assetPath: string }) => { };
}

export class LayoutInspectorEvents {
    public static Repaint = () => { };
}

export class RuntimeEvents {
    public static CreatedCanvas = (canvas: HTMLCanvasElement) => { };
}