import { IComponent } from "../components/IComponent";

export interface ISerializableFieldsMap {
    set(component: IComponent, property: string);
    get(component: IComponent, property: string);
    has(component: IComponent, property: string)
}