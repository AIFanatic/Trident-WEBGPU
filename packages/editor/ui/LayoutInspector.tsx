import { createElement, Component } from "../gooact";
import { LayoutInspectorGameObject } from "./Inspector/LayoutInspectorGameObject";
import { BaseProps } from "./Layout";

export class LayoutInspector extends Component<BaseProps> {
    render() {
        return <LayoutInspectorGameObject engineAPI={this.props.engineAPI}/>
    }
}