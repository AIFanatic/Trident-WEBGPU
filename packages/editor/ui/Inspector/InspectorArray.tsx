import { createElement, Component, VNode } from "../../gooact";
import { InspectorType } from "./InspectorType";
import { IEngineAPI } from "../../engine-api/trident/IEngineAPI";
import { StringUtils } from "../../helpers/StringUtils";

import './InspectorComponent.css';
import { DraggableList } from "./DraggableList";

export interface InspectorArrayProps {
    array: any[];
    elementType?: Function;
    engineAPI?: IEngineAPI;
    renderItem: (item: any, index: number) => Node;
    onChanged?: () => void;
}

export class InspectorArray extends Component<InspectorArrayProps> {
    private isRefType(): boolean {
        if (!this.props.engineAPI || !this.props.elementType) return false;
        const t = this.props.engineAPI.getFieldType(this.props.elementType);
        return t !== "unknown";
    }

    private onIncrement() {
        if (!this.props.elementType) return;

        this.props.array.push(this.isRefType() ? null : new (this.props.elementType as any)());

        if (this.props.onChanged) this.props.onChanged();
        this.setState({});
    }

    private onDecrement() {
        if (this.props.array.length === 0) return;

        this.props.array.pop();

        if (this.props.onChanged) this.props.onChanged();
        this.setState({});
    }

    private renderRefItem(item: any, index: number): VNode {
        let valueForType = "None";
        if (item?.assetPath) valueForType = StringUtils.GetNameForPath(item.assetPath);
        else if (item?.name) valueForType = item.name;

        return <InspectorType
            onChanged={(value) => { this.props.array[index] = value; this.setState({}); if (this.props.onChanged) this.props.onChanged(); }}
            component={this.props.array}
            property={index.toString()}
            value={valueForType}
            expectedType={this.props.elementType}
        />
    }

    public render() {
        const isRef = this.isRefType();

        return <div>
            <DraggableList
                items={this.props.array}
                renderItem={(item, index) => {
                    return isRef ? this.renderRefItem(item, index) : this.props.renderItem(item, index);
                }}
                onReorder={(items) => {
                    this.props.array.splice(0, this.props.array.length, ...items);
                    if (this.props.onChanged) this.props.onChanged();
                    this.setState({});
                }}
            />

            <div style={{ textAlign: "end", marginRight: "5px", marginBottom: "5px" }}>
                <button
                    onClick={() => { this.onIncrement(); }}
                    class="button"
                    style={{ width: "22px", cursor: "pointer" }}
                >
                    +
                </button>

                <button
                    onClick={() => { this.onDecrement(); }}
                    class="button"
                    style={{ width: "22px", cursor: "pointer" }}
                >
                    -
                </button>
            </div>
        </div>;
    }
}