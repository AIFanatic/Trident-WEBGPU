import { createElement, Component } from "../gooact";

interface ArrowProps {isOpen: boolean};
export class Arrow extends Component<ArrowProps> {
    render() {
        return <span style={`display: inline-block; rotate: ${this.props.isOpen ? "-90deg" : "180deg"}`}>〱</span>;
    }
}