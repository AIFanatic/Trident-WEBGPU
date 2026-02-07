import { createElement, Component } from "../gooact";
import { Menu } from "./MenuDropdown/Menu";
import { MenuDropdown } from "./MenuDropdown/MenuDropdown";
import { MenuItem } from "./MenuDropdown/MenuItem";

interface LayoutTabProps {
    entries: { title: string, node: Component }[];
}

interface LayoutTabState {
    selected: number;
}

export class LayoutTab extends Component<LayoutTabProps, LayoutTabState> {
    constructor(props) {
        super(props);
        this.setState({ selected: 0 });
    }

    private onClicked(index: number) {
        this.setState({ selected: index });
    }

    render() {
        const headers = this.props.entries.map((entry, index) => {
            const classes = `title ${index === this.state.selected ? "selected" : ""}`;
            return <div onClick={event => { this.onClicked(index) }} class={classes}>{entry.title}</div>;
        });
        const content = this.props.entries[this.state.selected].node;
        return (
            <div class="Layout">
                <div class="header">
                    {...headers}

                    <div class="right-action">
                        <Menu name="⋮">
                            <MenuItem name="Folder" onClicked={() => { this.createFolder() }} />
                            <MenuItem name="Material" onClicked={() => { this.createMaterial() }} />
                            <MenuItem name="Script" onClicked={() => { this.createScript() }} />
                            <MenuItem name="Scene" onClicked={() => { this.createScene() }} />
                        </Menu>
                    </div>
                </div>
                {content}
            </div>
        );
    }
}