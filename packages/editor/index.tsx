// import { createElement, render, Component } from "./gooact";

// class Counter extends Component<{ start: number }, { n: number }> {
//     constructor(props: { start: number }) {
//         super(props);
//         this.state = { n: props.start ?? 0 };
//     }
//     render() {
//         const { n } = this.state!;
//         return (
//             <button onClick={() => this.setState({ n: n + 1 })}>
//                 clicked {n}
//             </button>
//         );
//     }
// }

// render(<Counter start={2}/>, document.body);


import { createElement, render, Component } from "./gooact";
import { FlexLayout } from "./Components/FlexLayout";

class App extends Component{
    render() {
        return (
            <FlexLayout />
        );
    }
}

render(<App/>, document.body);