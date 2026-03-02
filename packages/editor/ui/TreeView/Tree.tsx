import { createElement, Component } from "../../gooact";
import './TreeView.css';

interface TreeProps { }

export class Tree extends Component<TreeProps> {
    render() {
        return (
            <div className="treeview">
                {[this.props.children].flat(Infinity)}
            </div>
        );
    }
}