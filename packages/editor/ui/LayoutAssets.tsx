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
import { Scene } from "@trident/core";

export interface FileData {
    file: FileSystemDirectoryHandle | FileSystemFileHandle;
    instance: any;
}

interface ProjectTreeMap extends ITreeMap<FileData> {
    data?: FileData
};

interface LayoutAssetsState {
    currentTreeMap: Map<string, ProjectTreeMap>;
};

export class LayoutAssets extends Component<BaseProps, LayoutAssetsState> {
    private fileWatcher: FileWatcher;
    constructor(props: BaseProps) {
        super(props);
        this.setState({ currentTreeMap: new Map() });

        this.fileWatcher = new FileWatcher();

        EventSystem.on(ProjectEvents.Opened, () => { this.fileWatcher.watch("") });
        EventSystem.on(FileEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
        EventSystem.on(DirectoryEvents.Created, (path, handle) => { this.onFileOrDirectoryCreated(path, handle) });
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
                    file: file,
                    instance: null
                }
            })
            // this.forceUpdate();
        }
        console.log("onFileOrDirectoryCreated", path, this.state.currentTreeMap)
        this.setState({ currentTreeMap: this.state.currentTreeMap });
    }

    private async onToggled(item) {
        console.log("onToggled", item);
    }

    private async onItemClicked(item: ITreeMap<FileData>) {
        console.log("onItemClicked", item);

        if (!item.data.instance) {
            await this.LoadFile(item);
        }
    }

    private async onItemDoubleClicked(item: ITreeMap<FileData>) {
        console.log("onItemDoubleClicked", item);

        if (!item.data.instance) {
            await this.LoadFile(item);
        }
        
        if (item.data.instance.type === Scene.type) {
            this.props.engineAPI.currentScene.Clear();
            this.props.engineAPI.currentScene.Deserialize(item.data.instance);
            EventSystem.emit(SceneEvents.Loaded, item.data.instance);

        }
    }

    private async LoadFile(item: ITreeMap<FileData>) {
        return new Promise(async (resolve, reject) => {
            if (item.data.file instanceof FileSystemFileHandle) {
                // Just match by extension for now
                const extension = item.data.file.name.slice(item.data.file.name.lastIndexOf(".") + 1);
                if (extension === "glb") {
                    const data = await item.data.file.getFile();
                    const arrayBuffer = await data.arrayBuffer();
                    const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer);
                    item.data.instance = prefab;
                    resolve(prefab);
                }
                else if (extension == "prefab") {
                    const data = await item.data.file.getFile();
                    const text = await data.text();
                    const prefab = JSON.parse(text) as IPrefab;
                    if (!prefab["type"]) throw Error("Prefab doesn't have a type");
                    item.data.instance = prefab;
                }
            }
        })
    }

    private onDropped(from, to) {
        console.log("onDropped");
    }

    private onDragStarted(event: DragEvent, item: ProjectTreeMap) {
        console.log("Assets onDragStarted", event, item)

        if (!item.data.instance) {
            this.LoadFile(item).then(() => {
                ExtendedDataTransfer.set({
                    data: item.data.instance,
                })
            })

        }

        ExtendedDataTransfer.set({
            data: item.data.instance,
        });
    }

    render() {
        let treeMapArr: ProjectTreeMap[] = [];
        for (const [name, entry] of this.state.currentTreeMap) {
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
            <div
                style={{
                    overflow: "auto",
                    height: "100%"
                }}
            // onClick={(event) => { this.onPanelClicked(event)}}
            >
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