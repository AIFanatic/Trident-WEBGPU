import { createElement, Component, VNode } from "../../gooact";

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
import { GameObjectEvents } from "../../Events";
import { StringUtils } from "../../helpers/StringUtils";
import { ExtendedDataTransfer } from "../../helpers/ExtendedDataTransfer";
import { InspectorDropdown, InspectorDropdownOptions } from "./InspectorDropdown";
import { InspectorArray } from "./InspectorArray";
import { TridentAPI } from "../../engine-api/trident/TridentAPI";
import { InspectorClass } from "./InspectorClass";
import { InspectorColorGradient } from "./InspectorColorGradient";
import { InspectorProperty } from "./InspectorProperty";
import { InspectorVector4 } from "./InspectorVector4";

interface LayoutInspectorProps {
    engineAPI: IEngineAPI;
    gameObject: IGameObject;
};

export class LayoutInspectorGameObject extends Component<LayoutInspectorProps> {
    constructor(props: LayoutInspectorProps) {
        super(props);
    }

    private onRemoveComponent(component: IComponent) {
        component.Destroy();
        this.setState({}); // force update
    }

    private onComponentPropertyChanged(component: IComponent | ITransform, property: string, value: any) {
        const type = typeof component[property];
        const customType = component[property];

        if (this.props.engineAPI.isVector3(component[property]) && this.props.engineAPI.isVector3(value)) {
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
        else if (customType) {
            component[property] = value;
        }

        this.setState({}); // force updated
    }

    private onGameObjectNameChanged(gameObject: IGameObject, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        gameObject.name = input.value;

        TridentAPI.EventSystem.emit(GameObjectEvents.Changed, gameObject);

        // this.forceUpdate()
    }

    private renderInspectorForComponentProperty(component: any, property: { name: string | symbol, type?: Function }): VNode<any> | null {
        const name = property.name as string;
        if (!(name in component)) return null;
        const type = property.type;
        const engineType = this.props.engineAPI.getFieldType(type);

        // console.log("field:", name, "type:", type?.name, "engineType:", engineType, component);

        if (engineType === "Vector4") return <InspectorVector4 onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} vector4={component[name]} />
        else if (engineType === "Vector3") return <InspectorVector3 onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} vector3={component[name]} />
        else if (engineType === "Vector2") return <InspectorVector2 onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} vector2={component[name]} />
        else if (engineType === "Color") return <InspectorColor onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} color={component[name]} />
        else if (engineType === "Gradient") return <InspectorColorGradient gradient={component[name]} onChanged={() => this.setState({})} />
        else if (type === Number) return <InspectorInput onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} value={component[name]} type="number" />
        else if (type === Boolean) return <InspectorCheckbox onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} selected={component[name]} />
        else if (Array.isArray(component[name])) {
            return <InspectorArray
                engineAPI={this.props.engineAPI}
                array={component[name]}
                elementType={type}
                onChanged={() => this.setState({})}
                renderItem={(item, index) => {
                    if (!item) return null;

                    return <div key={`${name}-${index}`}>
                        {...this.renderInspectorForComponent(item)}
                    </div>
                }}
            />
        }
        else if (typeof type === "function") {
            const currentValue = component[name];
            const engineType = this.props.engineAPI.getFieldType(type);
            const isRef = engineType !== "unknown" || currentValue?.assetPath;

            if (isRef) {
                let value = currentValue ? currentValue.constructor.name : "None";
                if (currentValue?.assetPath) value = StringUtils.GetNameForPath(currentValue.assetPath);
                else if (currentValue?.name) value = currentValue.name;

                return <InspectorType
                    onChanged={(value) => this.onComponentPropertyChanged(component, name, value)}
                    component={component}
                    property={name}
                    value={value}
                    expectedType={type}
                />
            }

            if (currentValue && this.props.engineAPI.GetSerializedFields(currentValue).length > 0) {
                return <InspectorClass>
                    {...this.renderInspectorForComponent(currentValue as any)}
                </InspectorClass>
            }
        }
        else if (typeof type === "object") {
            let selectOptions: InspectorDropdownOptions[] = []

            for (let property in type) {
                if (!isNaN(Number(property))) continue;
                selectOptions.push({ text: property, value: type[property] });
            }
            return <InspectorDropdown options={selectOptions} selected={(component as any)[name]} onSelected={(value) => { this.onComponentPropertyChanged(component, name, value) }} />
        }

        throw Error(`Unknown type ${type}`)
    }

    private renderInspectorForComponent(component: IComponent): VNode[] {
        let componentPropertiesHTML: VNode[] = [];

        const serializedProperties = this.props.engineAPI.GetInspectableFields(component);
        // Parse component properties
        for (let property of serializedProperties) {
            try {
                const componentPropertyElement = this.renderInspectorForComponentProperty(component, property);
                if (componentPropertyElement) {
                    const title = StringUtils.NicifyVariableName(property.name as string);

                    const stacked = componentPropertyElement.type === InspectorArray || componentPropertyElement.type === InspectorClass;
                    if (stacked) componentPropertiesHTML.push(<Collapsible header={title}> {componentPropertyElement} </Collapsible>);
                    else componentPropertiesHTML.push(<InspectorProperty title={title} stacked={stacked}> {componentPropertyElement} </InspectorProperty>);
                }
            } catch (error) {
                console.warn(error);
            }
        }

        return componentPropertiesHTML;
    }

    private renderInspectorForGameObject(gameObject: IGameObject) {
        let inspectorHTML: VNode[] = [];
        const components = gameObject.GetComponents();
        for (let component of components) {
            if (component.flags & this.props.engineAPI.flags.HideInInspector) continue;

            const componentPropertiesHTML = typeof component["OnInspectorGUI"] === "function" ? [component["OnInspectorGUI"]()] : this.renderInspectorForComponent(component);

            inspectorHTML.push(<Collapsible
                header={component.constructor.name}
                onRightMenuClicked={() => this.onRemoveComponent(component)} rightMenuText="x"
                onEnabledChanged={enabled => { component.enabled = enabled }} enabledCheckbox={component.enabled}
            >
                {...componentPropertiesHTML}
            </Collapsible>);
        }

        return inspectorHTML;
    }

    private onGameObjectEnabled(event: Event) {
        this.props.gameObject.enabled = (event.currentTarget as HTMLInputElement).checked;
        TridentAPI.EventSystem.emit(GameObjectEvents.Changed, this.props.gameObject);
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
                onDragEnter={(event: DragEvent) => { this.onDragEnter(event) }}
                onDrop={(event: DragEvent) => { this.onDrop(event) }}
                onDragOver={(event: DragEvent) => this.onDragOver(event)}
            >
                <div style={{
                    display: "flex",
                    padding: "10px"
                }}>
                    <input type="checkbox" checked={this.props.gameObject.enabled} onChange={(event: Event) => { this.onGameObjectEnabled(event) }} />
                    <input class="input" style="font-size: 10px;" type="text" value={this.props.gameObject.name} onChange={(event: Event) => { this.onGameObjectNameChanged(this.props.gameObject, event) }} />
                </div>
                <Collapsible header="Transform">
                    <InspectorProperty title="Position">
                        <InspectorVector3 key={`position-${this.props.gameObject.id}`} onChanged={(value) => { this.onComponentPropertyChanged(this.props.gameObject.transform, "localPosition", value) }} vector3={this.props.gameObject.transform.localPosition} />
                    </InspectorProperty>
                    <InspectorProperty title="Rotation">
                        <InspectorVector3 key={`rotation-${this.props.gameObject.id}`} onChanged={(value) => { this.onComponentPropertyChanged(this.props.gameObject.transform, "localEulerAngles", value) }} vector3={this.props.gameObject.transform.localEulerAngles} />
                    </InspectorProperty>
                    <InspectorProperty title="Scale">
                        <InspectorVector3 key={`scale-${this.props.gameObject.id}`} onChanged={(value) => { this.onComponentPropertyChanged(this.props.gameObject.transform, "scale", value) }} vector3={this.props.gameObject.transform.scale} />
                    </InspectorProperty>
                </Collapsible>

                {componentsElements}

                <AddComponent engineAPI={this.props.engineAPI} gameObject={this.props.gameObject} />
            </div>
        )
    }
}