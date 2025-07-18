export class Assets {
    static cache = new Map();
    static async Load(url, type) {
        const cached = Assets.cache.get(url);
        if (cached !== undefined) {
            return cached;
        }
        const promise = fetch(url).then(response => {
            if (!response.ok)
                throw Error(`File not found ${url}`);
            if (type === "json")
                return response.json();
            else if (type === "text")
                return response.text();
            else if (type === "binary")
                return response.arrayBuffer();
        }).then(result => {
            Assets.cache.set(url, Promise.resolve(result));
            return result;
        }).catch(error => {
            Assets.cache.delete(url);
            throw error;
        });
        Assets.cache.set(url, promise);
        return promise;
    }
}
