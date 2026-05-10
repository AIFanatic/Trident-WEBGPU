export function Formatter(code: string) {
    let indent = 0;
    const lines = code
        .replace(/\{/g, "{\n")
        .replace(/\}/g, "\n}")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    return lines.map((line) => {
        if (line.startsWith("}")) indent--;
        const formatted = `${"    ".repeat(Math.max(indent, 0))}${line}`;
        if (line.endsWith("{")) indent++;
        return formatted;
    }).join("\n");
}
