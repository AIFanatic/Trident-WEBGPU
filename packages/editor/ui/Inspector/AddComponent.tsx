import { createElement, Component as GOActComponent } from "../../gooact";
import { ComponentEvents, EventSystem } from "../../Events";

import { Component } from '@trident/core';
import { IGameObject } from "../../engine-api/trident/components/IGameObject";
import { IComponents } from "../../engine-api/trident/components";
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

    public render() {
        return (
            <div class="Floating-Menu" style={{position: "inherit", padding: "5px", margin: "10px"}}>
                <Tree>
                    <TreeFolder name="Add Component">
                        <TreeFolder name="Physics">
                            <TreeItem name="Rigidbody" onClicked={() => this.addComponent("Rigidbody")} />
                            <TreeItem name="BoxCollider" onClicked={() => this.addComponent("BoxCollider")} />
                        </TreeFolder>
                        <TreeItem name="Mesh" onClicked={() => this.addComponent(IComponents.Mesh.type)} />
                        <TreeFolder name="Lights">
                            <TreeItem name="DirectionalLight" onClicked={() => this.addComponent(IComponents.DirectionalLight.type)} />
                            <TreeItem name="PointLight" onClicked={() => this.addComponent(IComponents.PointLight.type)} />
                            <TreeItem name="SpotLight" onClicked={() => this.addComponent(IComponents.SpotLight.type)} />
                        </TreeFolder>
                    </TreeFolder>
                </Tree>
            </div>
        )
    }
}