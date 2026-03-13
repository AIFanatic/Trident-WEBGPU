// TODO: This and Tree are very inefficient

import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";
import { DirectoryEvents, EventSystem, FileEvents, ProjectEvents, SceneEvents } from "../Events";
import { FileWatcher } from "../helpers/FileWatcher";
import { StringUtils } from "../helpers/StringUtils";

import { ExtendedDataTransfer } from "../helpers/ExtendedDataTransfer";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { IPrefab } from "../engine-api/trident/components/IPrefab";
import { Assets, Prefab, Scene } from "@trident/core";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { IGeometry } from "../engine-api/trident/components/IGeometry";
import { IMaterial } from "../engine-api/trident/IMaterial";
import { IComponents } from "../engine-api/trident/components";
import { TreeFolder } from "./TreeView/TreeFolder";
import { TreeItem } from "./TreeView/TreeItem";
import { Tree } from "./TreeView/Tree";
import { IGameObject } from "../engine-api/trident/components/IGameObject";


export class LayoutAssetEvents {
    public static Selected = (instance: any) => {};
    public static RequestSaveMaterial = (material: IMaterial) => {};
}

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

interface ProjectTreeMap extends ITreeMap<FileData> {
    data?: FileData
};

interface LayoutAssetsState {
    currentTreeMap: Map<string, ProjectTreeMap>;
    selected: FileData;
    headerMenuOpen: boolean;
};

export async function dir(h?: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
    const r = indexedDB.open("d", 1);
    await new Promise(res => (r.onupgradeneeded = () => r.result.createObjectStore("s"), r.onsuccess = res));
    const db = r.result;
    const t = db.transaction("s", h ? "readwrite" : "readonly").objectStore("s");
    if (h) return t.put(h, "h"), h;
    return new Promise(res => (t.get("h").onsuccess = e => res((e.target as any).result || null)));
}

Assets.ResourceFetchFn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (input instanceof Request || input instanceof URL) throw Error("Not implemented");
    const handle = await FileBrowser.fopen(input, MODE.R);
    if (!handle) throw Error(`Could not get file at ${input}`);
    
    const file = await handle.getFile();
    return new Response(file);
}

export class LayoutAssets extends Component<BaseProps, LayoutAssetsState> {
    private fileWatcher: FileWatcher;
    constructor(props: BaseProps) {
        super(props);
        this.setState({ currentTreeMap: new Map(), selected: undefined, headerMenuOpen: false });

        this.fileWatcher = new FileWatcher();

        EventSystem.on(ProjectEvents.Opened, () => {
            this.fileWatcher.watch("");
            dir(FileBrowser.getRootFolderHandle());
        });
        EventSystem.on(FileEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
        EventSystem.on(DirectoryEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
        EventSystem.on(DirectoryEvents.Deleted, (path, handle) => { this.onFileOrDirectoryDeleted(path) });
        EventSystem.on(FileEvents.Deleted, (path, handle) => { this.onFileOrDirectoryDeleted(path) });

        EventSystem.on(LayoutAssetEvents.RequestSaveMaterial, (material) => {
            if (!material.assetPath) throw Error(`LayoutAssetEvents.RequestSaveMaterial could not save material because it doesn't have an assetPath.`);
            const materialSerialized = material.SerializeAsset();
            this.SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));
        });

        dir().then(handle => {
            if (handle) {
                FileBrowser.setRootFolderHandle(handle);
                EventSystem.emit(ProjectEvents.Opened);
            }
        })
    }

    private onFileOrDirectoryDeleted(path: string) {
        this.fileWatcher.unwatch(path);
        this.state.currentTreeMap.delete(path);
        this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: undefined });
    }

    private onFileOrDirectoryCreated(path: string, file: FileSystemDirectoryHandle | FileSystemFileHandle) {
        if (file instanceof FileSystemDirectoryHandle) {
            this.fileWatcher.watch(path);
        }
        if (!this.state.currentTreeMap.has(path)) {
            let type = file instanceof FileSystemFileHandle ? ITreeMapType.File : ITreeMapType.Folder;

            this.state.currentTreeMap.set(path, {
                id: path,
                name: file.name,
                isSelected: false,
                parent: StringUtils.Dirname(path) == path ? null : StringUtils.Dirname(path),
                type: type,
                data: {
                    path: path,
                    file: file,
                    instance: null
                }
            })
            // this.forceUpdate();
        }

        this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: this.state.selected });
    }

    private async onToggled(item) {
    }

    private async onItemClicked(item: ITreeMap<FileData>) {
        if (!item.data.instance) {
            await this.LoadTreeItem(item);
        }

        EventSystem.emit(LayoutAssetEvents.Selected, item.data.instance);

        this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: item.data });

        console.log("onItemClicked");
    }

    private async onItemDoubleClicked(item: ITreeMap<FileData>) {
        console.log("onItemDoubleClicked", item);

        if (!item.data.instance) {
            await this.LoadTreeItem(item);
        }

        if (item.data.instance.type === Scene.type) {
            this.props.engineAPI.currentScene.Clear();
            this.props.engineAPI.currentScene.Deserialize(item.data.instance);
            EventSystem.emit(SceneEvents.Loaded, item.data.instance);
        }
    }

    private async LoadTreeItem(item: ITreeMap<FileData>) {
        if (item.data.file.kind === "file") {
            const loadedFile = await this.LoadFile(item.data.path, item.data.file);
            item.data.instance = loadedFile;
            return loadedFile;
        }
        else if (item.data.file.kind === "directory") {
            return item.data.file;
        }
    }

    private async LoadFile(path: string, file: FileSystemFileHandle) {
        return new Promise<IPrefab | IGeometry | IMaterial>(async (resolve, reject) => {
            // Just match by extension for now
            const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
            if (extension === "glb") {
                const data = await file.getFile();
                const arrayBuffer = await data.arrayBuffer();
                const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, undefined, file.name.slice(0, file.name.lastIndexOf(".")));
                resolve(prefab);
            }
            else if (extension == "scene") {
                const data = await file.getFile();
                const text = await data.text();
                const json = JSON.parse(text);
                resolve(json);
            }
            else if (extension == "prefab") {
                const data = await file.getFile();
                const text = await data.text();
                const json = JSON.parse(text);
                const prefab = this.props.engineAPI.deserializePrefab(json);
                prefab.assetPath = path;
                resolve(prefab);
            }
            else if (extension == "geometry") {
                const data = await file.getFile();
                const text = await data.text();
                const json = JSON.parse(text);
                const geometry = this.props.engineAPI.deserializeGeometry(json);
                geometry.assetPath = path;
                resolve(geometry);
            }
            else if (extension == "material") {
                const data = await file.getFile();
                const text = await data.text();
                const json = JSON.parse(text);
                const material = this.props.engineAPI.deserializeMaterial(json);
                material.assetPath = path;
                resolve(material);
            }
            else if (extension == "png") {
                const data = await file.getFile();
                const arrayBuffer = await data.arrayBuffer();
                const texture = await this.props.engineAPI.createTextureFromBlob(new Blob([arrayBuffer]));
                texture.assetPath = path;
                resolve(texture);
            }
            else if (extension == "script") {
                const data = await file.getFile();
                const text = await data.text();
                const blob = new Blob([text], { type: 'text/javascript' });
                const blobUrl = URL.createObjectURL(blob);
                const script = await import(blobUrl);
                console.log(script)
                resolve(script);
            }
        })
    }

    private onDragStarted(event: DragEvent, item: ProjectTreeMap) {
        if (!item.data.instance) {
            this.LoadTreeItem(item).then(() => {
                ExtendedDataTransfer.data = item.data.instance;
            })
        }

        ExtendedDataTransfer.data = item.data.instance;

        console.log("onDragStarted", ExtendedDataTransfer.data);
    }

    private getCurrentPath(): string {
        if (!this.state.selected) return "";

        if (this.state.selected.file instanceof FileSystemFileHandle) return this.state.selected.path.slice(0, this.state.selected.path.lastIndexOf("/"));
        else if (this.state.selected.file instanceof FileSystemDirectoryHandle) return this.state.selected.path;

        throw Error("Invalid selected file");
    }

    private async createFolder() {
        const path = `${this.getCurrentPath()}/New folder`;
        const handle = await FileBrowser.mkdir(path);
        EventSystem.emit(DirectoryEvents.Created, path, handle);
        this.setState({...this.state, headerMenuOpen: !this.state.headerMenuOpen});
    }

    private async createMaterial() {
        const material = this.props.engineAPI.createPBRMaterial();
        material.assetPath = `${this.getCurrentPath()}/New Material.material`;
        const materialSerialized = material.SerializeAsset();
        this.SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));
        this.setState({...this.state, headerMenuOpen: !this.state.headerMenuOpen});
    }

    private async createScript() {
        const DefaultScript = `
            import { Components, SerializeField } from "@trident/core";

            export class NewComponent extends Components.Component {
                @SerializeField public test = 123;
                Start() {
                
                }
                Update() {}
            }
        `
        const scriptPath = `${this.getCurrentPath()}/NewComponent.script`;
        this.SaveToFile(scriptPath, new Blob([DefaultScript]));
        this.setState({...this.state, headerMenuOpen: !this.state.headerMenuOpen});
    }

    private async deleteAsset() {
        if (!this.state.selected) return;

        if (this.state.selected.file instanceof FileSystemFileHandle) {
            FileBrowser.remove(this.state.selected.path);
            EventSystem.emit(FileEvents.Deleted, this.state.selected.path, undefined);
        }
        else if (this.state.selected.file instanceof FileSystemDirectoryHandle) {
            FileBrowser.rmdir(this.state.selected.path);
            EventSystem.emit(DirectoryEvents.Deleted, this.state.selected.path, undefined);
        }
        this.setState({...this.state, headerMenuOpen: !this.state.headerMenuOpen});
    }

    public onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    private async SaveToFile(path: string, blob: Blob) {
        // console.warn("SaveToFile", path)
        try {
            const file = await FileBrowser.fopen(path, MODE.W);
            await FileBrowser.fwrite(file, blob);
        } catch (error) {
            console.error(`Failed to save at ${path}`);
            console.error(error);
        }
    }

    private async SavePrefab(dir: string, prefab: Prefab) {
        // Save prefab
        {
            console.log("Saving prefab", prefab)
            const name = prefab.name && prefab.name !== "" ? `${prefab.name}.prefab` : "Untitled.prefab";
            this.SaveToFile(`${dir}/${prefab.name}.glb/${name}`, new Blob([JSON.stringify(prefab)]));
        }
        prefab.traverse(async childPrefab => {
            for (const component of childPrefab.components) {
                if (component.type === IComponents.Mesh.type || component.type === IComponents.SkinnedMesh.type) {
                    // Save geometry
                    {
                        const geometry = Assets.GetInstance((component.geometry as IGeometry).assetPath) as IGeometry;
                        const geometrySerialized = geometry.SerializeAsset();
                        this.SaveToFile(`${dir}/${geometry.assetPath}`, new Blob([JSON.stringify(geometrySerialized)]));
                    }
                    // Save material
                    {
                        const material = Assets.GetInstance((component.material as IMaterial).assetPath) as IMaterial;
                        const materialSerialized = material.SerializeAsset();
                        this.SaveToFile(`${dir}/${material.assetPath}`, new Blob([JSON.stringify(materialSerialized)]));

                        // Save textures
                        if (material.params.albedoMap && material.params.albedoMap.blob) this.SaveToFile(`${dir}/${material.params.albedoMap.assetPath}`, material.params.albedoMap.blob);
                        if (material.params.normalMap && material.params.normalMap.blob) this.SaveToFile(`${dir}/${material.params.normalMap.assetPath}`, material.params.normalMap.blob);
                        if (material.params.armMap && material.params.armMap.blob) this.SaveToFile(`${dir}/${material.params.armMap.assetPath}`, material.params.armMap.blob);
                        if (material.params.heightMap && material.params.heightMap.blob) this.SaveToFile(`${dir}/${material.params.heightMap.assetPath}`, material.params.heightMap.blob);
                        if (material.params.emissiveMap && material.params.emissiveMap.blob) this.SaveToFile(`${dir}/${material.params.emissiveMap.assetPath}`, material.params.emissiveMap.blob);
                    }
                }
                // Save animation (single .animation file from Animator)
                if (component.type === IComponents.Animator.type && component.assetPath) {
                    const instance = Assets.GetInstance(component.assetPath);
                    if (instance?.SerializeAsset) {
                        this.SaveToFile(`${dir}/${component.assetPath}`, new Blob([JSON.stringify(instance.SerializeAsset())]));
                    } else if (instance) {
                        this.SaveToFile(`${dir}/${component.assetPath}`, new Blob([JSON.stringify(instance)]));
                    }
                }
            }
        })
    }

    private async onDrop(event: DragEvent) {
        event.preventDefault();

        console.log("onDrop", event, this.getCurrentPath())

        for (const file of event.dataTransfer?.files) {
            const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
            if (extension === "glb") {
                const arrayBuffer = await file.arrayBuffer();
                const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, undefined, file.name.slice(0, file.name.lastIndexOf(".")));
                const dir = `${this.getCurrentPath()}/${file.name}`;
                await FileBrowser.mkdir(dir);
                this.SavePrefab(this.getCurrentPath(), prefab);
            }
        }
        
        const extendedEventData = ExtendedDataTransfer.data as IGameObject;
        if (this.props.engineAPI.isGameObject(extendedEventData)) {
            this.SavePrefab(this.getCurrentPath(), extendedEventData.Serialize());
        }
    }

    private renderTreeItems(items: ProjectTreeMap[], allItems: ProjectTreeMap[]) {
        return items.map(item => {
            const children = allItems.filter(i => i.parent === item.id);

            if (item.type === ITreeMapType.Folder || children.length > 0) {
                return <TreeFolder
                    name={item.name}
                    id={item.id}
                    isSelected={item.isSelected}
                    onPointerDown={() => this.onItemClicked(item)}
                    onDoubleClicked={() => this.onItemDoubleClicked(item)}
                    onDropped={(event) => this.onDrop(event)}
                    onToggled={() => this.onToggled(item)}
                >
                    {this.renderTreeItems(children, allItems)}
                </TreeFolder>
            }
            return <TreeItem
                name={item.name}
                id={item.id}
                isSelected={item.isSelected}
                onPointerUp={() => this.onItemClicked(item)}
                onDoubleClicked={() => this.onItemDoubleClicked(item)}
                onDropped={(event) => this.onDrop(event)}
                onDragStarted={(event) => this.onDragStarted(event, item)}
            />
        });
    }

    render() {
        let treeMapArr: ProjectTreeMap[] = [];
        for (const [name, entry] of this.state.currentTreeMap) {
            entry.isSelected = this.state.selected && entry.id === this.state.selected.path ? true : false;
            treeMapArr.push(entry);
        }

        // Sort by folders first and then alphabetically
        treeMapArr.sort(function (a, b) {
            if ((a.type == ITreeMapType.Folder) != (b.type == ITreeMapType.Folder)) {
                return (a.type == ITreeMapType.Folder ? -1 : 1);
            }
            return a.name.localeCompare(b.name);
        });

        const rootItems = treeMapArr.filter(item => !item.parent);

        return (
            <div class="Layout"
                onDrop={(event) => this.onDrop(event)}
                onDragOver={(event) => this.onDragOver(event)}
            >
                <div class="header">
                    <div class="title">Assets</div>
                    <div class="right-action">
                        <button onClick={event => { this.setState({...this.state, headerMenuOpen: !this.state.headerMenuOpen})}}>⋮</button>
                        <div class="Floating-Menu" style={`display: ${this.state.headerMenuOpen ? "inherit" : "none"}`}>
                            <Tree>
                                <TreeItem name="Folder" onPointerDown={() => { this.createFolder() }} />
                                <TreeItem name="Material" onPointerDown={() => { this.createMaterial() }} />
                                <TreeItem name="Script" onPointerDown={() => { this.createScript() }} />
                                <TreeItem name="Scene" onPointerDown={() => { this.createScene() }} />
                                <TreeItem name="Delete" onPointerDown={() => { this.deleteAsset() }} />
                            </Tree>
                        </div>
                    </div>

                </div>

                <Tree>
                    {this.renderTreeItems(rootItems, treeMapArr)}
                </Tree>
            </div>
        );
    }
}