class Assets {
  static cache = /* @__PURE__ */ new Map();
  // Register a path
  static async Register(path, resource, force = false) {
    if (Assets.cache.has(path) && force === false) throw Error(`Assets[Register]: ${path} already set, use "force" to bypass.`);
    Assets.cache.set(path, Promise.resolve(resource));
  }
  static async Load(url, type) {
    const cached = Assets.cache.get(url);
    if (cached !== void 0) {
      return cached;
    }
    const promise = fetch(url).then((response) => {
      if (!response.ok) throw Error(`File not found ${url}`);
      if (type === "json") return response.json();
      else if (type === "text") return response.text();
      else if (type === "binary") return response.arrayBuffer();
    }).then((result) => {
      Assets.cache.set(url, Promise.resolve(result));
      return result;
    }).catch((error) => {
      Assets.cache.delete(url);
      throw error;
    });
    Assets.cache.set(url, promise);
    return promise;
  }
  static async LoadURL(url, type) {
    const cached = Assets.cache.get(url.href);
    if (cached !== void 0) {
      return cached;
    }
    const promise = fetch(url).then((response) => {
      if (!response.ok) throw Error(`File not found ${url}`);
      if (type === "json") return response.json();
      else if (type === "text") return response.text();
      else if (type === "binary") return response.arrayBuffer();
    }).then((result) => {
      Assets.cache.set(url.href, Promise.resolve(result));
      return result;
    }).catch((error) => {
      Assets.cache.delete(url.href);
      throw error;
    });
    Assets.cache.set(url.href, promise);
    return promise;
  }
}

export { Assets };
