import { createElement, Component } from "../gooact";

interface FloatingMenuProps {
    visible: boolean;
    onClose?: () => void;
    children?: any[];
}

export class FloatingMenu extends Component<FloatingMenuProps> {
    private menuEl: HTMLElement | null = null;
    private onWindowMouseDown = (event: MouseEvent) => {
        if (!this.menuEl) return;
        const target = event.target as Node;
        if (this.menuEl.contains(target)) return;

        // Ignore clicks on the trigger element (previous sibling)
        const trigger = (this.base as HTMLElement)?.previousElementSibling;
        if (trigger && trigger.contains(target)) return;

        if (this.props.onClose) this.props.onClose();
    };

    private onMenuRef(el: HTMLElement) {
        this.menuEl = el;
        this.reposition();
    }

    componentWillReceiveProps(nextProps: FloatingMenuProps) {
        if (nextProps.visible && !this.props.visible) {
            requestAnimationFrame(() => {
                this.reposition();
                window.addEventListener("mousedown", this.onWindowMouseDown);
            });
        } else if (!nextProps.visible && this.props.visible) {
            window.removeEventListener("mousedown", this.onWindowMouseDown);
        }
    }

    componentWillUnmount() {
        window.removeEventListener("mousedown", this.onWindowMouseDown);
    }

    private reposition() {
        if (!this.menuEl || !this.props.visible) return;

        this.menuEl.style.right = "";
        this.menuEl.style.bottom = "";

        const rect = this.menuEl.getBoundingClientRect();

        if (rect.right > window.innerWidth) {
            this.menuEl.style.right = "0";
        }
        if (rect.bottom > window.innerHeight) {
            this.menuEl.style.bottom = "100%";
        }
    }

    render() {
        return (
            <div
                class="Floating-Menu"
                ref={(el) => this.onMenuRef(el)}
                style={`display: ${this.props.visible ? "inherit" : "none"}`}
            >
                {this.props.children}
            </div>
        );
    }
}
