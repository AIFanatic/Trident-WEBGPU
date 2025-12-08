// This is not needed but its such a pain to define all the uniforms and attributes twice, just read them from the shader

import { ShaderAttribute, ShaderUniform } from "../../Shader";

interface ReflectionResult {
    attributes: Record<string, ShaderAttribute>;
    uniforms: Record<string, ShaderUniform>;
}

const attributeTypeMap: Record<string, { size: number; type: ShaderAttribute["type"] }> = {
    "vec2<f32>": { size: 2, type: "vec2" },
    "vec3<f32>": { size: 3, type: "vec3" },
    "vec4<f32>": { size: 4, type: "vec4" },
    "vec4<u32>": { size: 4, type: "vec4u" },
    "vec2<u32>": { size: 2, type: "vec2u" },
    "vec3<u32>": { size: 3, type: "vec3u" },
    "mat4x4<f32>": { size: 16, type: "mat4" },
};

function mapUniformType(varQualifier: string | null, wgslType: string): ShaderUniform["type"] | null {
    if (wgslType.startsWith("texture_depth")) return "depthTexture";
    if (wgslType.startsWith("texture_")) return "texture";
    if (wgslType.startsWith("sampler_comparison")) return "sampler-compare";
    if (wgslType.startsWith("sampler")) return "sampler";

    if (!varQualifier) return null;
    const qualifier = varQualifier.replace(/\s/g, "");
    if (qualifier.startsWith("uniform")) return "uniform";
    if (qualifier.startsWith("storage,read_write") || qualifier.startsWith("storage,readwrite")) return "storage-write";
    if (qualifier.startsWith("storage,write")) return "storage-write";
    if (qualifier.startsWith("storage")) return "storage";

    return null;
}

export function ReflectWGSL(code: string, entryPointName: string = "vertexMain"): ReflectionResult {
    const attributes: Record<string, ShaderAttribute> = {};
    const uniforms: Record<string, ShaderUniform> = {};

    const vertexInputStructs = new Set<string>();
    const vertexFnRegex = /@vertex\s+fn\s+(\w+)\s*\(([^)]*)\)/g;
    let vertexMatch: RegExpExecArray | null;
    while ((vertexMatch = vertexFnRegex.exec(code)) !== null) {
        const fnName = vertexMatch[1];
        const params = vertexMatch[2];
        if (fnName !== entryPointName) continue;
        const paramRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/g;
        let paramMatch: RegExpExecArray | null;
        while ((paramMatch = paramRegex.exec(params)) !== null) {
            const typeName = paramMatch[2];
            // Heuristic: struct names start with uppercase letter.
            if (/^[A-Z]/.test(typeName)) vertexInputStructs.add(typeName);
        }
    }

    const structRegex = /struct\s+([A-Za-z_][A-Za-z0-9_]*)\s*{([^}]*)}/gs;
    let structMatch: RegExpExecArray | null;
    while ((structMatch = structRegex.exec(code)) !== null) {
        const structName = structMatch[1];
        if (!vertexInputStructs.has(structName)) continue;
        const body = structMatch[2];
        const attributeRegex = /@location\((\d+)\)\s*([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_<>]+)\s*[,;]/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = attributeRegex.exec(body)) !== null) {
            const location = Number(attrMatch[1]);
            const name = attrMatch[2];
            const type = attrMatch[3];
            const mapped = attributeTypeMap[type];
            if (!mapped) continue;
            attributes[name] = {
                location,
                size: mapped.size,
                type: mapped.type,
            };
        }
    }

    const bindingRegex = /@group\((\d+)\)\s*@binding\((\d+)\)\s*var(?:<([^>]+)>)?\s+([A-Za-z0-9_]+)\s*:\s*([^;]+);/g;
    let bindingMatch: RegExpExecArray | null;
    while ((bindingMatch = bindingRegex.exec(code)) !== null) {
        const group = Number(bindingMatch[1]);
        const binding = Number(bindingMatch[2]);
        const qualifier = bindingMatch[3] ? bindingMatch[3].trim() : null;
        const name = bindingMatch[4];
        const typeName = bindingMatch[5].trim();
        const mappedType = mapUniformType(qualifier, typeName);
        if (!mappedType) continue;
        uniforms[name] = {
            group,
            binding,
            type: mappedType,
        };
    }

    return { attributes, uniforms };
}
