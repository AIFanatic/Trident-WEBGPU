import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { IMaterial } from "../engine-api/trident/IMaterial";
import { TridentAPI } from "../engine-api/trident/TridentAPI";
import { ComponentEvents, GameObjectEvents, LayoutAssetEvents, LayoutInspectorEvents } from "../Events";
import { createElement, Component } from "../gooact";
import { InspectorMaterial } from "./Inspector/InspectorMaterial";
import { LayoutInspectorGameObject } from "./Inspector/LayoutInspectorGameObject";
import { BaseProps } from "./Layout";
import { LayoutHierarchyEvents } from "./LayoutHierarchy";

interface LayoutInspectorState {
    selected: IGameObject | IMaterial;
}

export class LayoutInspector extends Component<BaseProps, LayoutInspectorState> {
    constructor(props) {
        super(props);
        TridentAPI.EventSystem.on(LayoutAssetEvents.Selected, (instance) => {
            if (this.props.engineAPI.isMaterial(instance)) {
                this.setState({ selected: instance });
            }
        })

        TridentAPI.EventSystem.on(LayoutHierarchyEvents.Selected, gameObject => {
            this.setState({ selected: gameObject });
        });

        TridentAPI.EventSystem.on(ComponentEvents.Created, (gameObject, component) => {
            this.setState({ selected: gameObject });
        })

        TridentAPI.EventSystem.on(GameObjectEvents.Changed, (gameObject, component) => {
            this.setState({ selected: gameObject });
        })

        TridentAPI.EventSystem.on(LayoutInspectorEvents.Repaint, () => {
            this.setState({ selected: this.state.selected });
        });

        this.state = { selected: undefined };
    }

    render() {
        let content = null;
        if (this.props.engineAPI.isGameObject(this.state.selected as IGameObject)) content = <LayoutInspectorGameObject engineAPI={this.props.engineAPI} gameObject={this.state.selected} />;
        else if (this.props.engineAPI.isMaterial(this.state.selected as IMaterial)) content = <InspectorMaterial engineAPI={this.props.engineAPI} material={this.state.selected as IMaterial} />;
        return <div style={{ height: "100%", overflow: "auto", width: "100%" }}>{content}</div>;
    }
}