import { SaveToFile } from "./SaveToFile";

const DefaultScript = `
    import { Components, SerializeField } from "@trident/core";

    export class NewComponent extends Components.Component {
        @SerializeField public test = 123;
        Start() {

        }
        Update() {}
    }
`;

export async function CreateScript(currentPath: string): Promise<void> {
    const scriptPath = `${currentPath}/NewComponent.ts`;
    await SaveToFile(scriptPath, new Blob([DefaultScript]));
}
