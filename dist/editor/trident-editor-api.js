let bridge = null;
function registerEditorBridge(impl) {
  bridge = impl;
}
function requireBridge() {
  if (!bridge) {
    throw new Error("EditorAPI is only available when running inside the Trident editor.");
  }
  return bridge;
}
const EditorAPI = {
  SaveAsset(asset) {
    return requireBridge().saveAsset(asset);
  }
};

export { EditorAPI, registerEditorBridge };
