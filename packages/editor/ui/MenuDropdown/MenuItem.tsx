import { createElement, Component } from "../../gooact";
import { Menu } from './Menu';

interface MenuItemProps {
    onClicked?: () => void;
    name: string;
    disabled?: boolean;
    closeMenu?: () => void;
}

export class MenuItem extends Component<MenuItemProps> {
    constructor(props: MenuItemProps) {
        super(props);
    }

    private onClicked(event: MouseEvent) {
        if(this.props.closeMenu) {
            this.props.closeMenu();
        }
        if(this.props.onClicked) {
            this.props.onClicked();
        }
    }

    public render() {
        return (
            <button
                className="dropdown-btn dropdown-item-btn"
                onClick={(event) => {this.onClicked(event)}}
                {...(this.props.disabled ? { disabled: true } : {})}
            >
                {this.props.name}
            </button>
        )
    }
}