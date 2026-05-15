import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { IMaterial } from "../engine-api/trident/IMaterial";
import { TridentAPI } from "../engine-api/trident/TridentAPI";
import { ComponentEvents, GameObjectEvents, LayoutAssetEvents, LayoutInspectorEvents, RuntimeEvents } from "../Events";
import { createElement, Component } from "../gooact";
import { InspectorMaterial } from "./Inspector/InspectorMaterial";
import { LayoutInspectorGameObject } from "./Inspector/LayoutInspectorGameObject";
import { BaseProps } from "./Layout";
import { LayoutHierarchyEvents } from "./LayoutHierarchy";

type Selected =
    | { type: "GameObject"; id: string }
    | { type: "Material"; instance: IMaterial }
    | undefined;

interface LayoutInspectorState {
    selected: Selected;
}

export class LayoutInspector extends Component<BaseProps, LayoutInspectorState> {
    constructor(props) {
        super(props);

        this.state = { selected: undefined };

        TridentAPI.EventSystem.on(LayoutAssetEvents.Selected, (instance) => {
            if (this.props.engineAPI.isMaterial(instance)) {
                this.setState({ selected: { type: "Material", instance } });
            }
        });

        TridentAPI.EventSystem.on(LayoutHierarchyEvents.Selected, gameObject => {
            this.setState({ selected: { type: "GameObject", id: gameObject.id } });
        });

        TridentAPI.EventSystem.on(ComponentEvents.Created, (gameObject, component) => {
            this.setState({ selected: { type: "GameObject", id: gameObject.id } });
        });

        TridentAPI.EventSystem.on(GameObjectEvents.Changed, (gameObject, component) => {
            this.setState({ selected: { type: "GameObject", id: gameObject.id } });
        });

        TridentAPI.EventSystem.on(GameObjectEvents.Deleted, (gameObject, component) => {
            if (this.state.selected?.type === "GameObject" && this.state.selected.id === gameObject.id) {
                this.setState({ selected: undefined });
            }
        });

        TridentAPI.EventSystem.on(RuntimeEvents.Play, () => {
            this.setState({ ...this.state });
        });

        TridentAPI.EventSystem.on(RuntimeEvents.Stop, () => {
            this.setState({ ...this.state });
        });

        TridentAPI.EventSystem.on(LayoutInspectorEvents.Repaint, () => {
            this.setState({ ...this.state });
        });
    }

    private findGameObjectById(id: string): IGameObject | undefined {
        const scene = this.props.engineAPI.currentScene;
        if (!scene) return undefined;

        return scene.GetGameObjects().find(go => go.id === id);
    }

    render() {
        let content = null;

        if (this.state.selected?.type === "GameObject") {
            const gameObject = this.findGameObjectById(this.state.selected.id);

            if (gameObject) {
                content = (
                    <LayoutInspectorGameObject
                        key={gameObject.id}
                        engineAPI={this.props.engineAPI}
                        gameObject={gameObject}
                    />
                );
            }
        } else if (this.state.selected?.type === "Material") {
            content = (
                <InspectorMaterial
                    engineAPI={this.props.engineAPI}
                    material={this.state.selected.instance}
                />
            );
        }

        return <div style={{ height: "100%", overflow: "auto", width: "100%" }}>{content}</div>;
    }
}