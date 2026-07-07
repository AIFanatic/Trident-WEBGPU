import { createElement, Component, VNode } from "../../gooact";
import { GPU } from "@trident/core";
import { IMaterial } from "../../engine-api/trident/IMaterial";

import './InspectorComponent.css';
import { Collapsible } from "../Collapsible/Collapsible";
import { InspectorVector3 } from "./InspectorVector3";
import { StringUtils } from "../../helpers/StringUtils";
import { InspectorColor } from "./InspectorColor";
import { InspectorVector2 } from "./InspectorVector2";
import { InspectorInput } from "./InspectorInput";
import { InspectorCheckbox } from "./InspectorCheckbox";
import { BaseProps } from "../Layout";
import { InspectorTexture } from "./InspectorTexture";
import { TridentAPI } from "../../engine-api/trident/TridentAPI";
import { LayoutAssetEvents } from "../../Events";
import { InspectorArray } from "./InspectorArray";
import { InspectorClass } from "./InspectorClass";
import { InspectorProperty } from "./InspectorProperty";
import { InspectorDropdown, InspectorDropdownOptions } from "./InspectorDropdown";
import { InspectorColorGradient } from "./InspectorColorGradient";
import { InspectorType } from "./InspectorType";
import { IComponent } from "packages/editor/engine-api/trident/components/IComponent";

interface InspectorMaterialProps extends BaseProps {
    material: IMaterial;
    onChanged?: (value: GPU.Shader) => void;
};

export class InspectorMaterial extends Component<InspectorMaterialProps> {
    constructor(props: InspectorMaterialProps) {
        super(props);
    }

    private onComponentPropertyChanged(object: Object, property: string, value: any) {
        object[property] = value;
        this.setState({}); // force updated
    }

    // private onGameObjectNameChanged(gameObject: IGameObject, event: Event) {
    //         const input = event.currentTarget as HTMLInputElement;
    //         gameObject.name = input.value;

    //         TridentAPI.EventSystem.emit(GameObjectEvents.Changed, gameObject);

    //         // this.forceUpdate()
    //     }

    private renderInspectorForComponentProperty(component: any, property: { name: string | symbol, type?: Function }): VNode<any> {
        const name = property.name as string;
        const type = property.type;
        const engineType = this.props.engineAPI.getFieldType(type);

        // console.log("field:", name, "type:", type?.name, "engineType:", engineType, component);

        if (engineType === "Vector3") return <InspectorVector3 onChanged={(value) => { this.onComponentPropertyChanged(component, name, value) }} vector3={component[name]} />
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

            if (currentValue && (this.props.engineAPI.GetSerializedFields(currentValue).length > 0 || currentValue.constructor === Object)) {
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

    private SaveClicked() {
        TridentAPI.EventSystem.emit(LayoutAssetEvents.RequestSaveAsset, this.props.material);
    }

    private onTypeSelected(newTypeId: string) {
        const currentType = (this.props.material.constructor as any).type;
        if (newTypeId === currentType) return;
        TridentAPI.EventSystem.emit(LayoutAssetEvents.RequestChangeMaterialType, this.props.material, newTypeId);
    }

    public render() {
        let title = this.props.material.name;
        if (this.props.material.assetPath) {
            const path = this.props.material.assetPath;
            title = path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
        }

        const componentsElements = this.renderInspectorForComponent(this.props.material.params);

        const currentType = (this.props.material.constructor as any).type;
        const options: InspectorDropdownOptions[] = Array.from(GPU.Material.Registry.keys()).map(type => ({ text: type, value: type }));

        return <div>
            <InspectorProperty title="Type">
                <InspectorDropdown
                    options={options}
                    selected={currentType}
                    onSelected={(value) => this.onTypeSelected(value)}
                />
            </InspectorProperty>

            <Collapsible header={`Material: ${title}`}>
                {...componentsElements}
            </Collapsible>

            <button
                class="Floating-Menu"
                style={{ position: "initial", margin: "10px", width: "calc(100% - 20px)", color: "white", cursor: "pointer" }}
                onClick={() => this.SaveClicked()}
            >
                SAVE
            </button>
        </div>
    }
}