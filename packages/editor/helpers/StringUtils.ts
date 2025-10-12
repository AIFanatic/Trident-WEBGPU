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