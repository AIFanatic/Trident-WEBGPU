import { createElement, Component } from "../../gooact";
import { InspectorClass } from "./InspectorClass";

import './InspectorComponent.css';

interface InspectorArrayProps {
    title: string;
    array: any[];
    elementType?: Function;
    renderItem: (item: any, index: number) => Node;
    onChanged?: () => void;
}

export class InspectorArray extends Component<InspectorArrayProps> {

    private onIncrement() {
        if (!this.props.elementType) return;

        this.props.array.push(new (this.props.elementType as any)());

        if (this.props.onChanged) this.props.onChanged();
        this.setState({});
    }

    private onDecrement() {
        if (this.props.array.length === 0) return;

        this.props.array.pop();

        if (this.props.onChanged) this.props.onChanged();
        this.setState({});
    }

    public render() {
        return <div>
            <InspectorClass title={this.props.title}>
                {...this.props.array.map((item, index) => {
                    return this.props.renderItem(item, index);
                })}
                <div style={{ width: "100%", textAlign: "end" }}>
                    <button onClick={event => { this.onIncrement(event) }} class="input" style={{ width: "22px", cursor: "pointer" }}>+</button>
                    <button onClick={event => { this.onDecrement(event) }} class="input" style={{ width: "22px", cursor: "pointer" }}>-</button>
                </div>
            </InspectorClass>
        </div>
    }
}