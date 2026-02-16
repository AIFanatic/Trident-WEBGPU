import { createElement, Component } from "../../gooact";
import "./MenuDropdown.css";

interface MenuButtonState {
    isDropdownVisible: boolean;
}

interface MenuButtonProps {
    onOptionClicked?: (option: string) => void;
    onToggled?: (isOpen: boolean) => void;
    name: string;
    enabled?: boolean;
    closeMenu?: () => void; // allow bubbling if Menu is nested
}

export class Menu extends Component<MenuButtonProps, MenuButtonState> {
    constructor(props: MenuButtonProps) {
        super(props);
        this.state = { isDropdownVisible: false };
    }

    public toggleDropdown() {
        const next = !this.state.isDropdownVisible;
        if (this.props.onToggled) this.props.onToggled(next);
        this.setState({ isDropdownVisible: next });
    }

    private closeSelfAndParent = () => {
        this.setState({ isDropdownVisible: false });
        if (this.props.closeMenu) this.props.closeMenu();
    };

    private toArray(children: any): any[] {
        if (children === undefined || children === null) return [];
        return Array.isArray(children) ? children : [children];
    }

    private withCloseMenu(children: any[]): any[] {
        return children.map((child) => {
            if (!child || typeof child !== "object") return child;
            return {
                ...child,
                props: {
                    ...(child.props || {}),
                    closeMenu: this.closeSelfAndParent,
                },
            };
        });
    }

    public render() {
        return (
            <div className="dropdown">
                <button className="dropdown-btn" onPointerDown={() => this.toggleDropdown()}>
                    {this.props.name}
                </button>

                {this.state.isDropdownVisible ? (
                    <div>
                        <div className="dropdown-overlay" onPointerDown={() => this.toggleDropdown()}></div>
                        <div className="dropdown-content">
                            {this.withCloseMenu(this.toArray(this.props.children))}
                        </div>
                    </div>
                ) : (
                    ""
                )}
            </div>
        );
    }
}