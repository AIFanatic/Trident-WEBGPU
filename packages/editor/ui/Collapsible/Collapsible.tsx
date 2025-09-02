import { createElement, Component } from "../../gooact";

import './Collapsible.css';

interface ICollapsibleProps {
    header: string;
    id?: string;
    open?: boolean;
    rightMenuText?: string;
    onRightMenuClicked?: () => void;
}

interface ICollapsibleState {
    isOpen: boolean;
    height: string;
}

export class Collapsible extends Component<ICollapsibleProps, ICollapsibleState> {
    constructor(props: ICollapsibleProps) {
        super(props);

        this.state = {isOpen: this.props.open ? this.props.open : true, height: ""}
        // this.handleFilterOpening();
    }
    
    private handleFilterOpening() {
        if (this.state.isOpen) {
            this.setState({isOpen: false, height: "0px"});
        }
        else {
            this.setState({isOpen: true, height: ""});
        }
    };

    private onRightMenuClicked(event: MouseEvent) {
        if (this.props.onRightMenuClicked) {
            this.props.onRightMenuClicked();
        }

        event.preventDefault();
        event.stopPropagation();
    }
    
    render() {

        return (
            <div className="collapsible-card-edonec" id={this.props.id ? this.props.id : ""}>
                <div>
                    <div className="collapsible-header-edonec" onClick={() => {this.handleFilterOpening() }}>
                        <button type="button" className="collapsible-icon-button-edonec">
                        {
                            this.state.isOpen ? "▼" : "▶"
                        }
                        </button>
                        <div className="title-text-edonec">{this.props.header}</div>
                        {
                            this.props.rightMenuText ? 
                            <div className="title-right-menu" onClick={(event) => {this.onRightMenuClicked(event)}}>{this.props.rightMenuText}</div>
                            : ""
                        }
                    </div>
                    </div>
                    <div className="collapsible-content-edonec" style={{ height: `${this.state.height}` }}>
                    <div>
                        <div className="collapsible-content-padding-edonec collapsible-children">{this.props.children}</div>
                    </div>
                </div>
            </div>
        );
    }
}