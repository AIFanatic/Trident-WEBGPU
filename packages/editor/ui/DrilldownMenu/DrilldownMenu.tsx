import { createElement, Component } from "../../gooact";

import './DrilldownMenu.css';

export interface IDrillDownItem {
    id: string,
    parentId: string,
    name: string
}

interface DrillDownMenuProps {
    items: IDrillDownItem[];
    currentParent: string;
    onItemClicked: (item: IDrillDownItem) => void;
}

interface DrillDownMenuState {
    items: IDrillDownItem[];
    currentParent: string;
}

export class DrillDownMenu extends Component<DrillDownMenuProps, DrillDownMenuState> {
    constructor(props: DrillDownMenuProps) {
        super(props);

        this.state = {items: this.props.items, currentParent: this.props.currentParent};
    }

    private onItemClicked(item: IDrillDownItem) {
        const children = this.getItemChildren(item);
        if (children.length == 0) {
            this.props.onItemClicked(item);
        }

        this.setState({currentParent: item.id, items: this.state.items});
    }

    private onBackClicked() {
        const parentItem = this.getItemById(this.state.currentParent);
        if (parentItem) {
            this.setState({currentParent: parentItem.parentId, items: this.state.items});
        }
        else {
            this.setState({currentParent: null, items: this.state.items});
        }
    }

    private getItemById(id: string): IDrillDownItem {
        for (let item of this.state.items) {
            if (item.id == id) return item;
        }
        return null;
    }

    private getItemChildren(item: IDrillDownItem): IDrillDownItem[] {
        let children: IDrillDownItem[] = [];

        for (let _item of this.state.items) {
            if (_item.parentId == item.id) children.push(_item);
        }
        return children;
    }

    private prepareItems() {
        let items: Element[] = [];

        for (let item of this.state.items) {
            if (item.parentId == this.state.currentParent) {
                const hasChildren = this.getItemChildren(item).length > 0;
                const itemElement = <li
                    className="item"
                    key={item.id}
                    onClick={(event) => {this.onItemClicked(item)}}
                >
                    {item.name}
                    {hasChildren ? <span className="item-caret">{"❯"}</span> : ""}
                </li>;
                items.push(itemElement);
            }
        }

        return items;
    }

    public render() {
        const itemsElements = this.prepareItems();
        return (
            <div className="DrillDownMenu">
                <button className="backBtn" onClick={(event) => this.onBackClicked()}>Back</button>
                {itemsElements}
            </div>
        )
    }
}