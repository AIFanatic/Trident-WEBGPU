import { createElement, Component as GOActComponent } from "../../gooact";
import { ComponentEvents, EventSystem } from "../../Events";

import { Component } from '@trident/core';
import { IGameObject } from "../../engine-api/trident/components/IGameObject";
import { Tree } from "../TreeView/Tree";
import { TreeFolder } from "../TreeView/TreeFolder";
import { TreeItem } from "../TreeView/TreeItem";

interface AddComponentProps {
    gameObject: IGameObject;
}

export class AddComponent extends GOActComponent<AddComponentProps> {
    constructor(props: AddComponentProps) {
        super(props);
    }

    private addComponent(registryEntry: string) {
        const componentClass = Component.Registry.get(registryEntry);

        if (!componentClass) throw Error(`Component ${registryEntry} does not exist in Components.Registry`);

        const componentInstance = this.props.gameObject.AddComponent(componentClass);
        EventSystem.emit(ComponentEvents.Created, this.props.gameObject, componentInstance);

        this.setState({ isMenuOpen: false });
    }

    private generateTree(entryMap: Map<string, typeof Component>) {
        const entriesByPath = new Map<string, { name: string, type: string }[]>();

        for (const [fullpath] of entryMap) {
            const compIdx = fullpath.lastIndexOf("components/");
            const path = compIdx !== -1 ? fullpath.slice(compIdx + "components/".length, fullpath.lastIndexOf("/") + 1) : fullpath.slice(0, fullpath.lastIndexOf("/") + 1);
            const name = fullpath.slice(fullpath.lastIndexOf("/") + 1);
            const pathEntries = entriesByPath.get(path) || [];
            pathEntries.push({ name, type: fullpath });
            entriesByPath.set(path, pathEntries);
        }

        return Array.from(entriesByPath).map(([path, entries]) => {
            const items = entries.map(e =>
                <TreeItem key={e.type} name={e.name} onPointerDown={() => this.addComponent(e.type)} />
            );

            return path === "" ? items : <TreeFolder key={path} name={path.replace("/", "")}>{items}</TreeFolder>;
        });
    }

    public render() {
        return (
            <div class="Floating-Menu" style={{ position: "inherit", padding: "5px", margin: "10px" }}>
                <Tree>
                    <TreeFolder name="Add Component">
                        {this.generateTree(Component.Registry)}
                    </TreeFolder>
                    {/* <TreeFolder name="Add Component">
                        <TreeFolder name="Physics">
                            <TreeItem name="Rigidbody" onPointerDown={() => this.addComponent("Rigidbody")} />
                            <TreeItem name="BoxCollider" onPointerDown={() => this.addComponent("BoxCollider")} />
                        </TreeFolder>
                        <TreeItem name="Mesh" onPointerDown={() => this.addComponent(IComponents.Mesh.type)} />
                        <TreeFolder name="Lights">
                            <TreeItem name="DirectionalLight" onPointerDown={() => this.addComponent(IComponents.DirectionalLight.type)} />
                            <TreeItem name="PointLight" onPointerDown={() => this.addComponent(IComponents.PointLight.type)} />
                            <TreeItem name="SpotLight" onPointerDown={() => this.addComponent(IComponents.SpotLight.type)} />
                        </TreeFolder>
                    </TreeFolder> */}
                </Tree>
            </div>
        )
    }
}