import { createElement, Component } from "../gooact";

interface LayoutTabProps {
    entries: {title: string, node: Component}[];
}

interface LayoutTabState {
    selected: number;
}

export class LayoutTab extends Component<LayoutTabProps, LayoutTabState> {
    constructor(props) {
        super(props);
        this.setState({selected: 0});
    }
    
    private onClicked(index: number) {
        this.setState({selected: index});
    }

    render() {
        const headers = this.props.entries.map((entry, index) => {
            const classes = `title ${index === this.state.selected ? "selected" : ""}`;
            return <div onClick={event => {this.onClicked(index)}} class={classes}>{entry.title}</div>;
        });
        const content = this.props.entries[this.state.selected].node;
        return (
            <div class="LayoutTab">
                <div class="header">
                    {...headers}
                </div>
                {content}
            </div>
        );
    }
}