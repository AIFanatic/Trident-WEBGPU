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
}

export class Menu extends Component<MenuButtonProps, MenuButtonState> {
    constructor(props: MenuButtonProps) {
        super(props);

        this.state = {isDropdownVisible: false};
    }

    public toggleDropdown() {
        if (this.props.onToggled) this.props.onToggled(!this.state.isDropdownVisible);

        this.setState({isDropdownVisible: !this.state.isDropdownVisible});
    }

    private onOptionClicked(option: string) {
        this.toggleDropdown();

        if (this.props.onOptionClicked) {
            this.props.onOptionClicked(option);
        }
    }

    public render() {
        return <div
        className="dropdown">
            <button
                className="dropdown-btn"
                onClick={(event) => this.toggleDropdown()}
            >
                {this.props.name}
            </button>

            {
                this.state.isDropdownVisible ?
                <div>
                    
                    <div className="dropdown-overlay" onClick={(event) => this.toggleDropdown()}></div>

                    <div className="dropdown-content">
                        {this.props.children}
                    </div>
                </div>
                : ""
            }
        </div>
    }
}