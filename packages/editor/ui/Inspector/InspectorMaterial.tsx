import { GPU } from "@trident/core";
import { createElement, Component } from "../../gooact";
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
import { EventSystem } from "../../Events";
import { LayoutAssetEvents } from "../LayoutAssets";

interface InspectorMaterialProps extends BaseProps {
    material: IMaterial;
    onChanged?: (value: GPU.Shader) => void;
};

export class InspectorMaterial extends Component<InspectorMaterialProps> {
    constructor(props: InspectorMaterialProps) {
        super(props);
    }

    private onPropertyChanged(object: Object, property: string, value: any) {
        object[property] = value;
        this.setState({}); // force updated
    }

    private renderInspectorForComponentProperty(component: Object, property: { name: string | symbol, type?: Function }): Node {
        const name = property.name as string;
        const type = property.type;
        const engineType = this.props.engineAPI.getFieldType(type);

        const title = StringUtils.CapitalizeStrArray(StringUtils.CamelCaseToArray(name)).join(" ");

        if (engineType === "Vector3") return <InspectorVector3 title={title} onChanged={(value) => { this.onPropertyChanged(component, name, value) }} vector3={component[name]} />
        else if (engineType === "Vector2") return <InspectorVector2 title={title} onChanged={(value) => { this.onPropertyChanged(component, name, value) }} vector2={component[name]} />
        else if (engineType === "Color") return <InspectorColor title={title} onChanged={(value) => { this.onPropertyChanged(component, name, value) }} color={component[name]} />
        else if (engineType === "Texture") {
            let valueForType = component[name].constructor.name;
            if (component[name].assetPath) {
                valueForType = StringUtils.GetNameForPath(component[name].assetPath);
            }

            return <InspectorTexture
                onChanged={(value) => { this.onPropertyChanged(component, name, value) }}
                title={title}
                component={component}
                property={name}
                value={valueForType}
            />
        }
        else if (type === Number) return <InspectorInput onChanged={(value) => { this.onPropertyChanged(component, name, value) }} title={title} value={component[name]} type="number" />
        else if (type === Boolean) return <InspectorCheckbox onChanged={(value) => { this.onPropertyChanged(component, name, value) }} title={title} selected={component[name]} />
    }

    private renderInspectorForObject(object: Object): Node[] {
        let componentPropertiesHTML: Node[] = [];

        const serializedProperties = this.props.engineAPI.GetSerializedFields(object);
        // Parse component properties
        for (let property of serializedProperties) {
            try {
                const componentPropertyElement = this.renderInspectorForComponentProperty(object, property);
                if (componentPropertyElement) {
                    componentPropertiesHTML.push(componentPropertyElement);
                }
            } catch (error) {
                console.warn(error);
            }
        }

        return componentPropertiesHTML;
    }

    private SaveClicked() {
        console.log("CLCLC", this.props.material, this.props.material.assetPath);
        EventSystem.emit(LayoutAssetEvents.RequestSaveMaterial, this.props.material);
    }

    public render() {
        let title = this.props.material.name;
        if (this.props.material.assetPath) {
            const path = this.props.material.assetPath;
            title = path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
        }

        const componentsElements = this.renderInspectorForObject(this.props.material.params);

        return <div style={{
            height: "100%",
            overflow: "auto",
            width: "100%"
        }}>

            <Collapsible header={`Material: ${ title }`}>
                {...componentsElements}
            </Collapsible>
            
            <button
                class="Floating-Menu"
                style={{position: "initial", margin: "10px", width: "calc(100% - 20px)", color: "white", cursor: "pointer"}}
                onClick={event => {this.SaveClicked()}}
            >
                SAVE
            </button>
        </div>
    }
}