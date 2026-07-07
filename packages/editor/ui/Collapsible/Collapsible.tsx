import { createElement, Component } from "../../gooact";
import { Arrow } from "../Arrow";

import './Collapsible.css';

interface ICollapsibleProps {
    header: string;
    id?: string;
    open?: boolean;
    rightMenuText?: string;
    onRightMenuClicked?: () => void;
    enabledCheckbox?: boolean;
    onEnabledChanged?: (value: boolean) => void;
}

interface ICollapsibleState {
    isOpen: boolean;
    height: string;
}

export class Collapsible extends Component<ICollapsibleProps, ICollapsibleState> {
    constructor(props: ICollapsibleProps) {
        super(props);

        this.state = {isOpen: this.props.open ? this.props.open : true, height: ""}
    }
    
    private handleFilterOpening(event: Event) {
        if (this.state.isOpen) this.setState({isOpen: false, height: "0px"});
        else this.setState({isOpen: true, height: ""});
    };

    private onRightMenuClicked(event: MouseEvent) {
        if (this.props.onRightMenuClicked) {
            this.props.onRightMenuClicked();
        }

        event.preventDefault();
        event.stopPropagation();
    }

    private onEnabledChanged(event: Event) {
        if (this.props.onEnabledChanged) {
            this.props.onEnabledChanged((event.currentTarget as HTMLInputElement).checked);
        }

        event.preventDefault();
        event.stopPropagation();
    }
    
    render() {

        return (
            <div className="collapsible-card-edonec" id={this.props.id ? this.props.id : ""}>
                <div>
                    <div className="collapsible-header-edonec">
                        <button onPointerDown={(event: Event) => {this.handleFilterOpening(event) }} type="button" className={`collapsible-icon-button-edonec`}>
                            <Arrow isOpen={this.state.isOpen}/>
                        </button>
                        {this.props.enabledCheckbox !== undefined ? <input checked={this.props.enabledCheckbox} type="checkbox" onChange={(event: Event) => {this.onEnabledChanged(event)}}/> : ""}
                        <div className="title-text-edonec">{this.props.header}</div>
                        {
                            this.props.rightMenuText ?  <div className="title-right-menu" onPointerDown={(event: PointerEvent) => {this.onRightMenuClicked(event)}}>{this.props.rightMenuText}</div> : ""
                        }
                    </div>
                    </div>
                    <div className="collapsible-content-edonec" style={{ height: `${this.state.height}` }}>
                    <div>
                        <div className="collapsible-children">{this.props.children}</div>
                    </div>
                </div>
            </div>
        );
    }
}