import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";
import { DirectoryEvents, EventSystem, FileEvents, ProjectEvents } from "../Events";
import { FileWatcher } from "../helpers/FileWatcher";
import { ITreeMap, ITreeMapType } from "./TreeView/ITreeMap";
import { StringUtils } from "../helpers/StringUtils";
import { Tree } from "./TreeView/Tree";

import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";

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
            this.state.currentTreeMap.set(path, {
                id: path,
                name: file.name,
                isSelected: false,
                parent: StringUtils.Dirname(path) == path ? null : StringUtils.Dirname(path),
                type: file instanceof FileSystemFileHandle ? ITreeMapType.File : ITreeMapType.Folder,
                data: {
                    file: file,
                    instance: null
                }
            })
            // this.forceUpdate();
        }
        console.log(this.state.currentTreeMap)
        this.setState({ currentTreeMap: this.state.currentTreeMap });
    }

    private onToggled(item) {
        console.log("onToggled", item);
    }

    private async onItemClicked(item: ITreeMap<FileData>) {
        console.log("onItemClicked", item);

        if (!item.data.instance) {
            if (item.data.file instanceof FileSystemFileHandle) {
                // Just match by extension for now
                const extension = item.data.file.name.slice(item.data.file.name.lastIndexOf(".") + 1);
                if (extension === "glb") {
                    console.log(extension)
    
                    const data = await item.data.file.getFile();
                    const arrayBuffer = await data.arrayBuffer();
                    const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer);
                    console.log(prefab)
                }
            }
        }
    }

    private onDropped(from, to) {
        console.log("onDropped");
    }

    render() {
        let treeMapArr: ProjectTreeMap[] = [];
        for (const [name, entry] of this.state.currentTreeMap) {
            treeMapArr.push(entry);
        }

        treeMapArr.sort(function (a, b) {
            if ((a.type == ITreeMapType.Folder) != (b.type == ITreeMapType.Folder)) {        // Is one a folder and
                return (a.type == ITreeMapType.Folder ? -1 : 1);       //  the other a file?
            }                                      // If not, compare the
            return a.name.localeCompare(b.name);   //  the names.
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
                    // onDoubleClicked={(data) => this.onItemDoubleClicked(data)}
                    data={treeMapArr}
                // onDragStarted={(event, data) => this.onDragStarted(event, data)}
                />
            </div>
        );
    }
}