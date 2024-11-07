type ResponseType<T> = T extends 'json' ? object
                      : T extends 'text' ? string
                      : T extends 'binary' ? ArrayBuffer
                      : never;

export class Assets {
    private static cache: Map<string, any> = new Map();

    public static async Load<T extends "json" | "text" | "binary">(url: string, type: T): Promise<ResponseType<T>> {
        const cached = Assets.cache.get(url);
        // console.warn("CACHED", cached !== undefined, url)
        if (cached) {
            return cached;
        }
        
        return fetch(url).then(response => {
            if(!response.ok) throw Error(`File not found ${url}`);
            if (type === "json") return response.json();
            else if (type === "text") return response.text();
            else if (type === "binary") return response.arrayBuffer();
        }).then(result => {
            Assets.cache.set(url, result);
            return result;
        })
    }
}