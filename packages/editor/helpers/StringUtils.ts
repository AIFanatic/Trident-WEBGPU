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

    static GetNameForPath(path: string): string {
        const extensionIndex = path.lastIndexOf(".");
        return path.slice(path.lastIndexOf("/") + 1, extensionIndex !== -1 ? extensionIndex : path.length);
    }

    static Dirname(path: string): string {
        const pathArr = path.split("/");
        const parentPath = pathArr.slice(0, pathArr.length - 1);
        return parentPath.join("/");
    }

    static NicifyVariableName(name: string): string {
        if (!name) return "";

        return name
            // Remove common private-field prefixes
            .replace(/^m_/, "")
            .replace(/^_+/, "")

            // Convert underscores/hyphens to spaces
            .replace(/[_-]+/g, " ")

            // Split camelCase: playerHealth -> player Health
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")

            // Split acronyms followed by normal words: XMLParser -> XML Parser
            .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")

            // Normalize spacing
            .replace(/\s+/g, " ")
            .trim()

            // Capitalize words, preserving short acronyms
            .split(" ")
            .map(word =>
                word === word.toUpperCase() && word.length <= 3
                    ? word
                    : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ");
    }
}