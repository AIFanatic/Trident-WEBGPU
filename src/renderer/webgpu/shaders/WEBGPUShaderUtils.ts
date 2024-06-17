import { Utils } from "../../../Utils";

export class WEBGPUShaderUtils {
    public static WGSLPreprocess(code: string, defines: {[key: string]: boolean}): string {
        const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);
    
        for (const condition of coditions) {
            const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
            const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
    
            if (defines[variable] === true) code = code.replaceAll(condition, value);
            else code = code.replaceAll(condition, "");
        }
        return code;
    }
}