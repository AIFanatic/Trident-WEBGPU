import { FileBrowser, MODE } from "../helpers/FileBrowser";

export async function SaveToFile(path: string, blob: Blob): Promise<void> {
    try {
        const file = await FileBrowser.fopen(path, MODE.W);
        await FileBrowser.fwrite(file, blob);
    } catch (error) {
        console.error(`Failed to save at ${path}`);
        console.error(error);
    }
}
