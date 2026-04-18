import { createElement, Component } from "../../gooact";

import { InspectorInput } from './InspectorInput';
import { InspectorCheckbox } from './InspectorCheckbox';
import { InspectorVector3 } from './InspectorVector3';
import { InspectorVector2 } from './InspectorVector2';
import { Collapsible } from '../Collapsible/Collapsible';
import { InspectorColor } from './InspectorColor';
import { AddComponent } from './AddComponent';

import { InspectorType } from './InspectorType';
import { IGameObject } from '../../engine-api/trident/components/IGameObject';
import { IComponent } from '../../engine-api/trident/components/IComponent';
import { ITransform } from '../../engine-api/trident/components/ITransform';
import { IEngineAPI } from '../../engine-api/trident/IEngineAPI';
import { ComponentEvents, GameObjectEvents, LayoutHierarchyEvents } from "../../Events";
import { StringUtils } from "../../helpers/StringUtils";
import { ExtendedDataTransfer } from "../../helpers/ExtendedDataTransfer";
import { InspectorDropdown, InspectorDropdownOptions } from "./InspectorDropdown";
import { InspectorClass } from "./InspectorClass";
import { InspectorArray } from "./InspectorArray";
import { TridentAPI } from "../../engine-api/trident/TridentAPI";

interface LayoutInspectorProps {
    engineAPI: IEngineAPI;
    gameObject: IGameObject;
};

export class LayoutInspectorGameObject extends Component<LayoutInspectorProps> {
    constructor(props) {
        super(props);
    }

    private onRemoveComponent(component: IComponent) {
        component.Destroy();
        this.setState({}); // force update
    }

    private onComponentPropertyChanged(component: IComponent | ITransform, property: string, value: any) {
        const type = typeof component[property];
        const classname = component.constructor.name;
        // const customType = SerializableTypesInstance.get(classname, property);
        const customType = component[property];

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

        this.setState({}); // force updated
    }

    private onGameObjectNameChanged(gameObject: IGameObject, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        gameObject.name = input.value;

        TridentAPI.EventSystem.emit(GameObjectEvents.Changed, gameObject);

        // this.forceUpdate()
    }

    private renderInspectorForComponentProperty(component: any, property: { name: string | symbol, type?: Function }): Node {
        const name = property.name as string;
        const type = property.type;
        const engineType = this.props.engineAPI.getFieldType(type);

        const title = StringUtils.CapitalizeStrArray(StringUtils.CamelCaseToArray(name)).join(" ");

        if (engineType === "Vector3") return <InspectorVector3 title={title} onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} vector3={component[name]} />
        else if (engineType === "Vector2") return <InspectorVector2 title={title} onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} vector2={component[name]} />
        else if (engineType === "Color") return <InspectorColor title={title} onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} color={component[name]} />
        else if (type === Number) return <InspectorInput onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} title={title} value={component[name]} type="number" />
        else if (type === Boolean) return <InspectorCheckbox onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} title={title} selected={component[name]} />
        else if (Array.isArray(component[name])) {
            return <InspectorArray
                title={title}
                array={component[name]}
                elementType={type}
                onChanged={() => this.setState({})}
                renderItem={(item, index) => {
                    if (!item) return null;

                    return <div title={`${title} ${index}`}>
                        {...this.renderInspectorForComponent(item)}
                    </div>
                }}
            />
        }
        else if (typeof type === "function") {
            const currentValue = component[name];
            let valueForType = currentValue ? currentValue.constructor.name : "None";
            if (currentValue?.assetPath) valueForType = StringUtils.GetNameForPath(currentValue.assetPath);
            else if (currentValue?.name) valueForType = currentValue.name;

            return <InspectorType
                onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }}
                title={title}
                component={component}
                property={name}
                value={valueForType}
                expectedType={type}
            />
        }
        else if (typeof type === "object") {
            let selectOptions: InspectorDropdownOptions[] = []

            for (let property in type) {
                if (!isNaN(Number(property))) continue;
                selectOptions.push({ text: property, value: type[property] });
            }
            return <InspectorDropdown title={title} options={selectOptions} selected={(component as any)[name]} onSelected={(value) => { this.onComponentPropertyChanged(component, name, value) }} />
        }
    }

    private renderInspectorForComponent(component: IComponent): Node[] {
        let componentPropertiesHTML: Node[] = [];

        const serializedProperties = this.props.engineAPI.GetSerializedFields(component);
        // Parse component properties
        for (let property of serializedProperties) {
            try {
                const componentPropertyElement = this.renderInspectorForComponentProperty(component, property);
                if (componentPropertyElement) {
                    componentPropertiesHTML.push(componentPropertyElement);
                }
            } catch (error) {
                console.warn(error);
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

    private onGameObjectEnabled(event) {
        this.props.gameObject.enabled = event.target.checked;
    }

    private onDragEnter(event: DragEvent) {
        event.preventDefault();
    }

    private onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    // TODO: This needs to be better
    private onDrop(event: DragEvent) {
        const draggedItem = ExtendedDataTransfer.data;
        const component = draggedItem[Object.keys(draggedItem)[0]];
        // console.log("onDrop", draggedItem, this.props.engineAPI.isComponent(component));
        this.props.engineAPI.addComponent(this.props.gameObject, component);
        this.setState({}); // force updated
    }

    public render() {
        const componentsElements = this.renderInspectorForGameObject(this.props.gameObject);
        return (
            <div style={{
                height: "100%",
                overflow: "auto",
                width: "100%",
            }}
                onDragEnter={(event) => { this.onDragEnter(event) }}
                onDrop={(event) => { this.onDrop(event) }}
                onDragOver={(event) => this.onDragOver(event)}
            >
                <div style={{
                    display: "flex",
                    padding: "10px"
                }}>
                    <input type="checkbox" checked={this.props.gameObject.enabled} onChange={event => { this.onGameObjectEnabled(event) }} />
                    <input style={{
                        width: "100%",
                        fontSize: "12px",
                        background: "#121212",
                        borderRadius: "5px",
                        color: "white",
                        border: "none",
                        outline: "none",
                        paddingLeft: "5px",
                    }}
                        type="text"
                        value={this.props.gameObject.name}
                        onChange={(event) => { this.onGameObjectNameChanged(this.props.gameObject, event) }}
                    />
                </div>

                <Collapsible header="Transform">
                    <InspectorVector3 key={`position-${this.props.gameObject.id}`} title="Position" onChanged={(value) => { this.onComponentPropertyChanged(this.props.gameObject.transform, "localPosition", value) }} vector3={this.props.gameObject.transform.localPosition} />
                    <InspectorVector3 key={`rotation-${this.props.gameObject.id}`} title="Rotation" onChanged={(value) => { this.onComponentPropertyChanged(this.props.gameObject.transform, "localEulerAngles", value) }} vector3={this.props.gameObject.transform.localEulerAngles} />
                    <InspectorVector3 key={`scale-${this.props.gameObject.id}`} title="Scale" onChanged={(value) => { this.onComponentPropertyChanged(this.props.gameObject.transform, "scale", value) }} vector3={this.props.gameObject.transform.scale} />
                </Collapsible>

                {componentsElements}

                <AddComponent engineAPI={this.props.engineAPI} gameObject={this.props.gameObject} />
            </div>
        )
    }
}