export class Utils {
    public static UUID(): string {
        return Math.floor(Math.random() * 1e6).toString();
    }

    public static StringFindAllBetween(source: string, start: string, end: string, exclusive: boolean = true): string[] {
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapeRegExp(start)}(.*?)${escapeRegExp(end)}`, 'gs');
        const matches: string[] = [];
        let match;
    
        while ((match = regex.exec(source)) !== null) {
            if (exclusive) matches.push(match[1]);
            else matches.push(start + match[1] + end);
        }
    
        return matches;
    }
}