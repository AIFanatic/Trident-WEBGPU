import { createElement, Component } from "../../gooact";

import { InspectorInput } from './InspectorInput';
import { InspectorDropdown, InspectorDropdownOptions } from './InspectorDropdown';
import { InspectorCheckbox } from './InspectorCheckbox';
import { InspectorVector3 } from './InspectorVector3';
import { InspectorVector2 } from './InspectorVector2';
import { Collapsible } from '../Collapsible/Collapsible';
// // import { StringUtils } from '../helpers/StringUtils';
import { InspectorColor } from './InspectorColor';
// // import { AddComponent } from './AddComponent';

import { InspectorClass } from './InspectorClass';
import { InspectorType } from './InspectorType';
import { IGameObject } from '../../engine-api/trident/components/IGameObject';
import { IComponent } from '../../engine-api/trident/components/IComponent';
import { ITransform } from '../../engine-api/trident/components/ITransform';
import { IEngineAPI } from '../../engine-api/trident/IEngineAPI';
import { EventSystem } from "../../Events";
import { LayoutHierarchyEvents } from "../LayoutHierarchy";

interface LayoutInspectorProps {
    engineAPI: IEngineAPI;
};

interface LayoutInspectorState {
    gameObject: IGameObject;
};


export class StringUtils {
    static CamelCaseToArray(str: string) {
        return str.split(/(?=[A-Z])/);
    }

    static CapitalizeStrArray(strArr: string[]): string[] {
        let output: string[] = [];

        for (let word of strArr) {
            output.push(word[0].toUpperCase() + word.slice(1));
        }
        return output;
    }

    static GetEnumKeyByEnumValue(myEnum, enumValue) {
        let keys = Object.keys(myEnum).filter(x => myEnum[x] == enumValue);
        return keys.length > 0 ? keys[0] : null;
    }

    static GetNameForPath(path: string): string {
        const pathArray = path.split("/");
        const nameArr = pathArray[pathArray.length-1].split(".");
        return nameArr[0];
    }

    static Dirname(path: string): string {
        const pathArr = path.split("/");
        const parentPath = pathArr.slice(0, pathArr.length-1);
        return parentPath.join("/");
    }
}

export class LayoutInspectorGameObject extends Component<LayoutInspectorProps, LayoutInspectorState> {
    constructor(props) {
        super(props);

        this.state = {gameObject: null};

        console.log("HEREEE")

        EventSystem.on(LayoutHierarchyEvents.Selected, gameObject => {
            console.log("LayoutInspectorGameObject", gameObject)
            this.setState({gameObject: gameObject});
        });
        
        // EventEmitter.on("onGameObjectComponentsChanged", (gameObject) => {
        //     this.forceUpdate();
        // })

        // EventEmitter.on("onGameObjectComponentUpdated", (gameObject) => {
        //     this.forceUpdate();
        // })
    }

    private onRemoveComponent(component: IComponent) {
        // component.Destroy();
        // this.forceUpdate();
    }

    private onComponentPropertyChanged(component: IComponent | ITransform, property: string, value: any) {
        const type = typeof component[property];
        const classname = component.constructor.name;
        // const customType = SerializableTypesInstance.get(classname, property);
        const customType = component[property];

        // console.log(type, component, property, value);

        if (customType) {
            component[property] = value;
        }
        else if (this.props.engineAPI.isVector3(component[property]) && this.props.engineAPI.isVector3(value)) {
            component[property].copy(value);
        }
        else if (this.props.engineAPI.isColor(component[property]) && this.props.engineAPI.isColor(value)) {
            component[property].copy(value);
        }
        else if (type == "boolean") {
            component[property] = value;
        }
        else if (type == "number") {
            component[property] = parseFloat(value);
        }

        // this.forceUpdate();
    }

    private onGameObjectNameChanged(gameObject: IGameObject, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        gameObject.name = input.value;

        // EventEmitter.emit("onGameObjectNameChanged", gameObject, gameObject.name);

        // this.forceUpdate()
    }

    private getInstanceParentInstance(instance: object): Function {
        const prototype = Object.getPrototypeOf(instance);
        const prototypeParent = Object.getPrototypeOf(prototype);

        if (prototypeParent.constructor.name == "Object" || prototypeParent.constructor.name == "EventDispatcher") {
            return prototype.constructor;
        }
        return this.getInstanceParentInstance(prototype);
    }

    private renderInspectorForComponentProperty(component: IComponent, property: string, checkCustomTypeOnly = false): Node {
        const classname = component.constructor.name;
        const type = typeof component[property];
        
        if (type == "function") return null;

        const title = StringUtils.CapitalizeStrArray(StringUtils.CamelCaseToArray(property)).join(" ");
        const customType = component[property];

        // if (customType) {
        //     if (typeof customType == "function") {
        //         return <InspectorClass title={title}>
        //             {this.renderInspectorForComponent(component[property])}
        //         </InspectorClass>
        //     }
        //     else if (typeof customType == "object") {
        //         let selectOptions: InspectorDropdownOptions[] = []

        //         for (let property in customType) {
        //             if (!isNaN(Number(property))) continue;
        //             selectOptions.push({text: property, value: customType[property]});
        //         }
        //         return <InspectorDropdown title={title} options={selectOptions} selected={component[property]} onSelected={(value) => {this.onComponentPropertyChanged(component, property, value)}}/>
        //     }
        // }

        if (checkCustomTypeOnly) return;

        if (this.props.engineAPI.isVector3(component[property])) {
            return <InspectorVector3 title={title} onChanged={(value) => {this.onComponentPropertyChanged(component, property, value)}} vector3={component[property]}/>
        }
        else if (this.props.engineAPI.isColor(component[property])) {
            return <InspectorColor title={title} onChanged={(value) => {this.onComponentPropertyChanged(component, property, value)}} color={component[property]}/>
        }
        else if (this.props.engineAPI.isVector2(component[property])) {
            return <InspectorVector2 title={title} onChanged={(value) => {this.onComponentPropertyChanged(component, property, value)}} vector2={component[property]}/>
        }
        else if (type == "number") {
            return <InspectorInput onChanged={(value) => {this.onComponentPropertyChanged(component, property, value)}} title={title} value={component[property]} type="number"/>
        }
        else if (type == "boolean") {
            return <InspectorCheckbox onChanged={(value) => {this.onComponentPropertyChanged(component, property, value)}} title={title} selected={component[property]} />
        }
        else if (type == "object") {
            let valueForType = component[property].constructor.name;
            if (component[property].userData && component[property].userData.fileId) {
                valueForType = StringUtils.GetNameForPath(component[property].userData.fileId);
            }

            return <InspectorType
                onChanged={(value) => {this.onComponentPropertyChanged(component, property, value)}}
                title={title}
                component={component}
                property={property}
                value={valueForType}
            />
        }   
    }

    private renderInspectorForComponent(component: IComponent): Node[] {
        console.log("component", component)
        let componentPropertiesHTML: Node[] = [];

        // Parse component properties
        for (let property of Object.getOwnPropertyNames(Object.getPrototypeOf(component))) {
            if (!component[property]) continue;
            if (!this.props.engineAPI.SerializableFields.has(component, property)) continue;

            try {
                const componentPropertyElement = this.renderInspectorForComponentProperty(component, property);
                if (componentPropertyElement) {
                    componentPropertiesHTML.push(componentPropertyElement);
                }
            } catch (error) {
                console.warn(error);
            }
        }

        // Parses component class instances properties
        for (let property in component) {
            try {
                if (!this.props.engineAPI.SerializableFields.has(component, property)) continue;
                const componentPropertyElement = this.renderInspectorForComponentProperty(component, property, false);
                if (componentPropertyElement && !componentPropertiesHTML.includes(componentPropertyElement)) {
                    componentPropertiesHTML.push(componentPropertyElement);
                }
            } catch (error) {
                // console.warn(error);
            }
        }

        return componentPropertiesHTML;
    }

    private renderInspectorForGameObject(gameObject: IGameObject) {
        let inspectorHTML: Node[] = [];
        const components = gameObject.GetComponents();
        for (let component of components) {
            const componentCast = component as IComponent;
            const componentPropertiesHTML = this.renderInspectorForComponent(componentCast);

            const componentHTML = <Collapsible 
                header={componentCast.constructor.name}
                onRightMenuClicked={() => this.onRemoveComponent(component)}
                rightMenuText="x"
                >
                {...componentPropertiesHTML}
            </Collapsible>

            inspectorHTML.push(componentHTML);
        }

        return inspectorHTML;
    }

    public render() {
        if (!this.state.gameObject) return <div></div>;

        const componentsElements = this.renderInspectorForGameObject(this.state.gameObject);
        return (
            <div style={{
                height: "100%",
                overflow: "auto"
            }}>
                <div style={{
                    display: "flex",
                    padding: "10px"
                }}>
                    <input type="checkbox" checked={true}/>
                    <input style={{
                        width: "100%",
                        fontSize: "12px",
                        background: "#121212",
                        borderRadius: "5px",
                        color: "white",
                        border: "none",
                        outline: "none",
                        paddingLeft: "5px",
                        paddingTop: "2px",
                        paddingBottom: "2px",
                        marginRight: "10px"
                    }}
                    type="text"
                    value={this.state.gameObject.name}
                    onChange={(event) => {this.onGameObjectNameChanged(this.state.gameObject, event)}}
                    />
                </div>

                <Collapsible header="Transform">
                    <InspectorVector3 title="Position" onChanged={(value) => {this.onComponentPropertyChanged(this.state.gameObject.transform, "position", value)}} vector3={this.state.gameObject.transform.position}/>
                    <InspectorVector3 title="Rotation" onChanged={(value) => {this.onComponentPropertyChanged(this.state.gameObject.transform, "localEulerAngles", value)}} vector3={this.state.gameObject.transform.eulerAngles}/>
                    <InspectorVector3 title="Scale" onChanged={(value) => {this.onComponentPropertyChanged(this.state.gameObject.transform, "localScale", value)}} vector3={this.state.gameObject.transform.scale}/>
                </Collapsible>

                {componentsElements}

                {/* <AddComponent gameObject={this.state.gameObject}/> */}
            </div>
        )
    }
}