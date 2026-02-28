// TODO: This and Tree are very inefficient

import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";
import { DirectoryEvents, EventSystem, FileEvents, ProjectEvents, SceneEvents } from "../Events";
import { FileWatcher } from "../helpers/FileWatcher";
import { ITreeMap, ITreeMapType } from "./TreeView/ITreeMap";
import { StringUtils } from "../helpers/StringUtils";
import { Tree } from "./TreeView/Tree";

import { ExtendedDataTransfer } from "../helpers/ExtendedDataTransfer";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { IPrefab } from "../engine-api/trident/components/IPrefab";
import { Assets, PBRMaterial, Scene } from "@trident/core";
import { Menu } from "./MenuDropdown/Menu";
import { MenuItem } from "./MenuDropdown/MenuItem";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { IGeometry } from "../engine-api/trident/components/IGeometry";
import { IMaterial } from "../engine-api/trident/IMaterial";
import { IComponents } from "../engine-api/trident/components";

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
        this.setState({ currentTreeMap: new Map(), selected: undefined });

        this.fileWatcher = new FileWatcher();

        EventSystem.on(ProjectEvents.Opened, () => {
            this.fileWatcher.watch("");
            dir(FileBrowser.getRootFolderHandle());
        });
        EventSystem.on(FileEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
        EventSystem.on(DirectoryEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
        EventSystem.on(DirectoryEvents.Deleted, (path, handle) => { this.onFileOrDirectoryDeleted(path) });
        EventSystem.on(FileEvents.Deleted, (path, handle) => { this.onFileOrDirectoryDeleted(path) });

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
        this.setState({ currentTreeMap: this.state.currentTreeMap, selected: undefined });
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

        this.setState({ currentTreeMap: this.state.currentTreeMap, selected: this.state.selected });
    }

    private async onToggled(item) {
        console.log("onToggled", item);
    }

    private async onItemClicked(item: ITreeMap<FileData>) {
        if (!item.data.instance) {
            await this.LoadTreeItem(item);
        }

        this.setState({ currentTreeMap: this.state.currentTreeMap, selected: item.data });
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
        })
    }

    private onDropped(from, to) {
        console.log("onDropped");
    }

    private onDragStarted(event: DragEvent, item: ProjectTreeMap) {
        if (!item.data.instance) {
            this.LoadTreeItem(item).then(() => {
                ExtendedDataTransfer.data = item.data.instance;
            })
        }

        ExtendedDataTransfer.data = item.data.instance;

        console.log("HERE", ExtendedDataTransfer.data)
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
    }

    public onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    public async onDrop(event: DragEvent) {
        console.log("on drop", event);
        event.preventDefault();

        const file = event.dataTransfer?.files?.[0];
        if (!file) return;

        // const newFileName = `${this.getCurrentPath()}/${file.name}`;
        // const arrayBuffer = await file.arrayBuffer();
        // const copyFile = await FileBrowser.fopen(newFileName, MODE.W);
        // FileBrowser.fwrite(copyFile, arrayBuffer);

        const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
        if (extension === "glb") {
            const arrayBuffer = await file.arrayBuffer();
            const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, undefined, file.name.slice(0, file.name.lastIndexOf(".")));

            await FileBrowser.mkdir(file.name);
            prefab.traverse(async prefab => {
                for (const component of prefab.components) {
                    if (component.type === IComponents.Mesh.type) {

                        async function SaveToFile(path: string, blob: Blob) {
                            const file = await FileBrowser.fopen(path, MODE.W);
                            await FileBrowser.fwrite(file, blob);
                        }

                        // Save geometry
                        {
                            const geometry = Assets.GetInstance((component.geometry as IGeometry).assetPath) as IGeometry;
                            const geometrySerialized = geometry.SerializeAsset();
                            SaveToFile(geometry.assetPath, new Blob([JSON.stringify(geometrySerialized)]));
                        }
                        // Save material
                        {
                            const material = Assets.GetInstance((component.material as PBRMaterial).assetPath) as PBRMaterial;
                            const materialSerialized = material.SerializeAsset();
                            SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));

                            // Save textures
                            if (material.params.albedoMap && material.params.albedoMap.blob) SaveToFile(material.params.albedoMap.assetPath, material.params.albedoMap.blob);
                            if (material.params.normalMap && material.params.normalMap.blob) SaveToFile(material.params.normalMap.assetPath, material.params.normalMap.blob);
                            if (material.params.armMap && material.params.armMap.blob) SaveToFile(material.params.armMap.assetPath, material.params.armMap.blob);
                            if (material.params.heightMap && material.params.heightMap.blob) SaveToFile(material.params.heightMap.assetPath, material.params.heightMap.blob);
                            if (material.params.emissiveMap && material.params.emissiveMap.blob) SaveToFile(material.params.emissiveMap.assetPath, material.params.emissiveMap.blob);
                        }

                        // Save prefab
                        {
                            SaveToFile(`${file.name}/${file.name}.prefab`, new Blob([JSON.stringify(prefab)]));
                        }
                    }
                }
            })
        }

        // const url = URL.createObjectURL(file);
        // const prefab = await GLTFLoader.LoadFromURL(url, "glb");
        // console.log(JSON.stringify(prefab))
        // // const obj = currentScene.Instantiate(prefab);
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

        return (
            <div class="Layout"
                onDrop={(event) => this.onDrop(event)}
                onDragOver={(event) => this.onDragOver(event)}
            >
                <div class="header">
                    <div class="title">Assets</div>
                    <div class="right-action">
                        <Menu name="⋮">
                            <MenuItem name="Folder" onClicked={() => { this.createFolder() }} />
                            <MenuItem name="Material" onClicked={() => { this.createMaterial() }} />
                            <MenuItem name="Script" onClicked={() => { this.createScript() }} />
                            <MenuItem name="Scene" onClicked={() => { this.createScene() }} />
                            <MenuItem name="Delete" onClicked={() => { this.deleteAsset() }} />
                        </Menu>
                    </div>
                </div>
                <Tree
                    onToggled={(item) => this.onToggled(item)}
                    onDropped={(from, to) => this.onDropped(from, to)}
                    onClicked={(data) => this.onItemClicked(data)}
                    onDoubleClicked={(data) => this.onItemDoubleClicked(data)}
                    onDragStarted={(event, data) => this.onDragStarted(event, data)}
                    data={treeMapArr}
                />
            </div>
        );
    }
}