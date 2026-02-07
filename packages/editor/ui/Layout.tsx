import { createElement, Component } from "../gooact";
import { LayoutResizer } from "./LayoutResizer";

import { LayoutCanvas } from "./LayoutCanvas";
import { LayoutAssets } from "./LayoutAssets";
import { LayoutHierarchy } from "./LayoutHierarchy";
import { LayoutInspector } from "./LayoutInspector";
import { LayoutConsole } from "./LayoutConsole";

import "./Layout.css";
import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { LayoutTab } from "./LayoutTab";
import { LayoutTopbar } from "./LayoutTopbar";

export interface BaseProps {
    engineAPI: IEngineAPI;
}
  
export class Layout extends Component<BaseProps> {
    render() {
        return (
            <flex class="v" style="flex: 1; height: 100%;">
                <flex-item ><LayoutTopbar engineAPI={this.props.engineAPI}/></flex-item>
                <LayoutResizer />
                <flex class="h" style="flex: 1; height: 100%;">
                    <flex class="v" style="flex: 2;">
                        <flex-item style="flex: 2;"><LayoutCanvas engineAPI={this.props.engineAPI} /></flex-item>
                        <LayoutResizer />
                        {/* <flex-item style="flex: 1;"><LayoutAssets engineAPI={this.props.engineAPI} /></flex-item> */}
                        <flex class="h" style="flex: 1;">
                            {/* <flex-item style="flex: 1;"><LayoutAssets engineAPI={this.props.engineAPI} /></flex-item>
                            <LayoutResizer />
                            <flex-item style="flex: 1;"><LayoutConsole engineAPI={this.props.engineAPI}/></flex-item> */}

                            <flex-item style="flex: 1;">
                                <LayoutTab entries={[
                                    {title: "Assets", node: <LayoutAssets engineAPI={this.props.engineAPI} />},
                                    {title: "Console", node: <LayoutConsole engineAPI={this.props.engineAPI}/>}
                                ]} />
                            </flex-item>
                        </flex>
                    </flex>
                    <LayoutResizer />
                    <flex-item style="flex: 1;"><LayoutHierarchy engineAPI={this.props.engineAPI}/></flex-item>
                    <LayoutResizer />
                    <flex class="v" style="flex: 1;">
                        <flex-item style="flex: 1;"><LayoutInspector engineAPI={this.props.engineAPI}/></flex-item>
                    </flex>
                </flex>
            </flex>
        );
    }
}