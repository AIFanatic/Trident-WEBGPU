import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

interface LayoutConsoleState {
    messages: {text: string, type: "log" | "error" | "warn"}[];
}

export class LayoutConsole extends Component<BaseProps, LayoutConsoleState> {
    constructor(props) {
        super(props);
        this.setState({messages: []});

        this.consoleOverride("log");
        this.consoleOverride("warn");
        this.consoleOverride("error");
    }

    private consoleOverride(type: "log" | "error" | "warn") {
        const originalMethod = window.console[type];
        window.console[type] = (data) => {
            this.setState({messages: this.state.messages.concat({text: data, type: type})});
            originalMethod.call(this, data);
        }
    }

    render() {
        let messages: HTMLDivElement[] = [];
        for (const message of this.state.messages) {
            messages.push(<div class={message.type}>{message.text}</div>);
        }
        return (
            <div class="LayoutConsole">Console
                {...messages}
            </div>
        );
    }
}