import { createElement, Component } from "../../gooact";

import './MenuDropdown.css';

interface MenuButtonState {
    isDropdownVisible: boolean;
}

interface MenuButtonProps {
    onOptionClicked?: (option: string) => void;
    onToggled?: (isOpen: boolean) => void;
    name: string;
    enabled?: boolean;
    closeMenu?: () => void;
}

export class MenuDropdown extends Component<MenuButtonProps, MenuButtonState> {
    constructor(props: MenuButtonProps) {
        super(props);

        this.state = {isDropdownVisible: false};
    }

    private toggleDropdown() {
        if (this.props.onToggled) this.props.onToggled(!this.state.isDropdownVisible);

        this.setState({isDropdownVisible: !this.state.isDropdownVisible});
    }

    private onOptionClicked(option: string) {
        this.toggleDropdown();

        if (this.props.onOptionClicked) {
            this.props.onOptionClicked(option);
        }
    }

    private async contentRef(container: HTMLDivElement) {
        // TODO: I'm sure there is a better way of doing this.
        if (!container) return;
        
        setTimeout(() => {
            if (this.props.children) {
                const w = container.parentElement.clientWidth;
                const h = container.parentElement.clientHeight;
                container.style.marginLeft = w + "px";
                container.style.marginTop = -25 + "px";
                container.style.display = "";
            }
        }, 1);
    
    }

    public render() {
        return (<div
            className="dropdown-menu">
                <button
                    className="dropdown-btn dropdown-item-btn"
                    onClick={(event) => this.toggleDropdown()}
                >
                    {this.props.name}
                </button>
                <span className="dropdown-right-icon">{"▶"}</span>
                {
                    this.state.isDropdownVisible ?
                    <div>
                        <div ref={ref => this.contentRef(ref)} className="dropdown-content" style="display: none;">
                            {this.props.children}
                            {/* {
                                React.Children.map(this.props.children, (child) =>
                                {
                                    const childCast = child as React.ReactElement;
                                    if (this.props.closeMenu) {
                                        return React.cloneElement(childCast, {closeMenu: () => {this.props.closeMenu()}});
                                    }
                                    return childCast;
                                }
                            )} */}
                        </div>
                    </div>
                    : ""
                }
            </div>)
    }
}