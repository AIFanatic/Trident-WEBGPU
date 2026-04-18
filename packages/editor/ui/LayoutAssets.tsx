import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";
import { DirectoryEvents, FileEvents, LayoutAssetEvents, ProjectEvents, SceneEvents } from "../Events";
import { FileWatcher } from "../helpers/FileWatcher";
import { StringUtils } from "../helpers/StringUtils";
import { ExtendedDataTransfer } from "../helpers/ExtendedDataTransfer";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Assets, Scene } from "@trident/core";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { IMaterial } from "../engine-api/trident/IMaterial";
import { TreeFolder } from "./TreeView/TreeFolder";
import { TreeItem } from "./TreeView/TreeItem";
import { Tree } from "./TreeView/Tree";
import { FloatingMenu } from "./FloatingMenu";
import { IGameObject } from "../engine-api/trident/components/IGameObject";

import { LoadFile } from "../loaders/AssetLoader";
import {
    CreateFolder,
    CreateMaterial,
    CreateScript,
    CreateScene,
    DeleteAsset,
    SavePrefab,
    SaveGameObjectAsAsset,
    SaveAsset,
} from "../commands";

// Re-export types for backward compatibility
export { ITreeMapType, ITreeMap, FileData, ProjectTreeMap } from "../types/AssetTypes";
import { ITreeMapType, ITreeMap, FileData, ProjectTreeMap } from "../types/AssetTypes";
import { ReloadScript } from "../commands/ReloadScript";
import { TridentAPI } from "../engine-api/trident/TridentAPI";

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

interface LayoutAssetsState {
    currentTreeMap: Map<string, ProjectTreeMap>;
    selected: FileData;
    headerMenuOpen: boolean;
}

export class LayoutAssets extends Component<BaseProps, LayoutAssetsState> {
    private fileWatcher: FileWatcher;
    constructor(props: BaseProps) {
        super(props);
        this.setState({ currentTreeMap: new Map(), selected: undefined, headerMenuOpen: false });

        this.fileWatcher = new FileWatcher();

        TridentAPI.EventSystem.on(ProjectEvents.Opened, () => {
            this.fileWatcher.watch("");
            dir(FileBrowser.getRootFolderHandle());
        });
        TridentAPI.EventSystem.on(FileEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
        TridentAPI.EventSystem.on(DirectoryEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
        TridentAPI.EventSystem.on(DirectoryEvents.Deleted, (path, handle) => { this.onFileOrDirectoryDeleted(path) });
        TridentAPI.EventSystem.on(FileEvents.Deleted, (path, handle) => { this.onFileOrDirectoryDeleted(path) });

        TridentAPI.EventSystem.on(LayoutAssetEvents.RequestSaveAsset, (material) => {
            SaveAsset(material);
        });

        dir().then(handle => {
            if (handle) {
                FileBrowser.setRootFolderHandle(handle);
                TridentAPI.EventSystem.emit(ProjectEvents.Opened);
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
        }

        this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: this.state.selected });
    }

    private async onToggled(item) {
    }

    private async onItemClicked(item: ITreeMap<FileData>) {
        if (!item.data.instance) {
            await this.loadTreeItem(item.data);
        }

        TridentAPI.EventSystem.emit(LayoutAssetEvents.Selected, item.data.instance);
        this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: item.data });
    }

    private async onItemDoubleClicked(item: ITreeMap<FileData>) {
        if (!item.data.instance) {
            await this.loadTreeItem(item.data);
        }

        if (item.data.instance.type === Scene.type) {
            this.props.engineAPI.currentScene.Clear();
            await this.props.engineAPI.deserializer.deserializeScene(this.props.engineAPI.currentScene, item.data.instance);
            TridentAPI.EventSystem.emit(SceneEvents.Loaded, item.data.instance);
        }
    }

    private async onRefresh() {
        if (!this.state.selected) return;
        if (!this.state.selected.path.endsWith(".ts")) return;

        await ReloadScript(this.props.engineAPI, this.state.selected.path);
    }

    private async loadTreeItem(data: FileData): Promise<any> {
        if (data.file.kind === "file") {
            const loadedFile = await LoadFile(data.path, data.file as FileSystemFileHandle, this.props.engineAPI);
            data.instance = loadedFile;
            return loadedFile;
        }
        return data.file;
    }

    private getCurrentPath(): string {
        if (!this.state.selected) return "";

        if (this.state.selected.file instanceof FileSystemFileHandle) return this.state.selected.path.slice(0, this.state.selected.path.lastIndexOf("/"));
        else if (this.state.selected.file instanceof FileSystemDirectoryHandle) return this.state.selected.path;

        throw Error("Invalid selected file");
    }

    private async createFolder() {
        await CreateFolder(this.getCurrentPath());
        this.setState({ ...this.state, headerMenuOpen: false });
    }

    private async createMaterial() {
        await CreateMaterial(this.props.engineAPI, this.getCurrentPath());
        this.setState({ ...this.state, headerMenuOpen: false });
    }

    private async createScript() {
        await CreateScript(this.getCurrentPath());
        this.setState({ ...this.state, headerMenuOpen: false });
    }

    private async createScene() {
        await CreateScene(this.getCurrentPath());
        this.setState({ ...this.state, headerMenuOpen: false });
    }

    private async deleteAsset() {
        await DeleteAsset(this.state.selected);
        this.setState({ ...this.state, headerMenuOpen: false });
    }

    private onDragStarted(event: DragEvent, item: ProjectTreeMap) {
        if (!item.data.instance) {
            this.loadTreeItem(item.data).then(() => {
                ExtendedDataTransfer.data = item.data.instance;
            })
        }

        ExtendedDataTransfer.data = item.data.instance;
    }

    public onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    private async onDrop(event: DragEvent) {
        event.preventDefault();

        for (const file of event.dataTransfer?.files) {
            const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
            if (extension === "glb") {
                const arrayBuffer = await file.arrayBuffer();
                const rootName = file.name.slice(0, file.name.lastIndexOf("."));
                const rootGO = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, this.props.engineAPI.currentScene, rootName);
                SaveGameObjectAsAsset(this.getCurrentPath(), rootGO);
            }
        }

        const extendedEventData = ExtendedDataTransfer.data as IGameObject;
        if (this.props.engineAPI.isGameObject(extendedEventData)) {
            SavePrefab(this.getCurrentPath(), extendedEventData);
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
                        <button onClick={event => { this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen }) }}>⋮</button>
                        <FloatingMenu visible={this.state.headerMenuOpen} onClose={() => this.setState({ ...this.state, headerMenuOpen: false })}>
                            <Tree>
                                <TreeItem name="Folder" onPointerDown={() => { this.createFolder() }} />
                                <TreeItem name="Material" onPointerDown={() => { this.createMaterial() }} />
                                <TreeItem name="Script" onPointerDown={() => { this.createScript() }} />
                                <TreeItem name="Scene" onPointerDown={() => { this.createScene() }} />
                                <TreeItem name="Delete" onPointerDown={() => { this.deleteAsset() }} />
                                <TreeItem name="Refresh" onPointerDown={() => { this.onRefresh() }} />
                            </Tree>
                        </FloatingMenu>
                    </div>

                </div>

                <Tree>
                    {this.renderTreeItems(rootItems, treeMapArr)}
                </Tree>
            </div>
        );
    }
}
