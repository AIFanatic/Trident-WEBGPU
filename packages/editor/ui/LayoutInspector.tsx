import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { IMaterial } from "../engine-api/trident/IMaterial";
import { ComponentEvents, EventSystem, GameObjectEvents, LayoutHierarchyEvents } from "../Events";
import { createElement, Component } from "../gooact";
import { InspectorMaterial } from "./Inspector/InspectorMaterial";
import { LayoutInspectorGameObject } from "./Inspector/LayoutInspectorGameObject";
import { BaseProps } from "./Layout";
import { LayoutAssetEvents } from "./LayoutAssets";

interface LayoutInspectorState {
    selected: IGameObject | IMaterial;
}

export class LayoutInspector extends Component<BaseProps, LayoutInspectorState> {
    constructor(props) {
        super(props);
        EventSystem.on(LayoutAssetEvents.Selected, (instance) => {
            if (this.props.engineAPI.isMaterial(instance)) {
                this.setState({ selected: instance });
            }
        })

        EventSystem.on(LayoutHierarchyEvents.Selected, gameObject => {
            this.setState({ selected: gameObject });
        });

        EventSystem.on(ComponentEvents.Created, (gameObject, component) => {
            this.setState({ selected: gameObject });
        })

        EventSystem.on(GameObjectEvents.Changed, (gameObject, component) => {
            this.setState({ selected: gameObject });
        })

        this.state = { selected: undefined };
    }

    render() {
        let content = null;
        if (this.props.engineAPI.isGameObject(this.state.selected as IGameObject)) content = <LayoutInspectorGameObject engineAPI={this.props.engineAPI} gameObject={this.state.selected} />;
        else if (this.props.engineAPI.isMaterial(this.state.selected as IMaterial)) content = <InspectorMaterial engineAPI={this.props.engineAPI} material={this.state.selected as IMaterial} />;
        return <div style={{ height: "100%", overflow: "auto", width: "100%" }}>{content}</div>;
    }
}