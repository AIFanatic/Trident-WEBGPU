import { createElement, Component as GOActComponent } from "../../gooact";
import { ComponentEvents } from "../../Events";

import { Component } from '@trident/core';
import { IGameObject } from "../../engine-api/trident/components/IGameObject";
import { ComponentRegistry } from "../../engine-api/trident/ComponentRegistry";
import { Tree } from "../TreeView/Tree";
import { TreeFolder } from "../TreeView/TreeFolder";
import { TreeItem } from "../TreeView/TreeItem";
import { IEngineAPI } from "../../engine-api/trident/IEngineAPI";
import { IComponent } from "../../engine-api/trident/components/IComponent";
import { TridentAPI } from "../../engine-api/trident/TridentAPI";

interface AddComponentProps {
    engineAPI: IEngineAPI;
    gameObject: IGameObject;
}

export class AddComponent extends GOActComponent<AddComponentProps> {
    constructor(props: AddComponentProps) {
        super(props);
    }

    private addComponent(component: IComponent) {
        const componentInstance = this.props.engineAPI.addComponent(this.props.gameObject, component);
        TridentAPI.EventSystem.emit(ComponentEvents.Created, this.props.gameObject, componentInstance);

        this.setState({ isMenuOpen: false });
    }

    public render() {
        return (
            <div class="Floating-Menu" style={{ position: "inherit", padding: "5px", margin: "10px" }}>
                <Tree>
                    {/* <TreeFolder name="Add Component">
                        {this.generateTree(Component.Registry)}
                    </TreeFolder> */}
                    <TreeFolder name="Add Component">
                        <TreeFolder name="Physics">
                            <TreeItem name="Rigidbody" onPointerDown={() => this.addComponent(ComponentRegistry.RigidBody)} />
                            <TreeItem name="BoxCollider" onPointerDown={() => this.addComponent(ComponentRegistry.BoxCollider)} />
                            <TreeItem name="CapsuleCollider" onPointerDown={() => this.addComponent(ComponentRegistry.CapsuleCollider)} />
                            <TreeItem name="MeshCollider" onPointerDown={() => this.addComponent(ComponentRegistry.MeshCollider)} />
                            <TreeItem name="PlaneCollider" onPointerDown={() => this.addComponent(ComponentRegistry.PlaneCollider)} />
                            <TreeItem name="SphereCollider" onPointerDown={() => this.addComponent(ComponentRegistry.SphereCollider)} />
                        </TreeFolder>
                        <TreeItem name="Mesh" onPointerDown={() => this.addComponent(ComponentRegistry.Mesh)} />
                        <TreeItem name="LODGroup" onPointerDown={() => this.addComponent(ComponentRegistry.LODGroup)} />
                        <TreeFolder name="Lights">
                            <TreeItem name="DirectionalLight" onPointerDown={() => this.addComponent(ComponentRegistry.DirectionalLight)} />
                            <TreeItem name="PointLight" onPointerDown={() => this.addComponent(ComponentRegistry.PointLight)} />
                            <TreeItem name="SpotLight" onPointerDown={() => this.addComponent(ComponentRegistry.SpotLight)} />
                        </TreeFolder>
                    </TreeFolder>
                </Tree>
            </div>
        )
    }
}
