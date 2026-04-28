const createElement = (type, props, ...children) => {
  if (props === null) props = {};
  return { type, props, children };
};

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
class EditorAPI {
  static SaveAsset(asset) {
    return requireBridge().saveAsset(asset);
  }
  static CreateElement(type, props, ...children) {
    return createElement(type, props, ...children);
  }
  static RepaintInspector() {
    return requireBridge().repaintInspector();
  }
  static LayoutInspectorInput(props) {
    return requireBridge().LayoutInspectorInput(props);
  }
  static ExtendedDataTransfer() {
    return requireBridge().ExtendedDataTransfer();
  }
  static Events = {
    onSceneSaved(handler) {
      return requireBridge().events.onSceneSaved(handler);
    },
    offSceneSaved(handler) {
      return requireBridge().events.offSceneSaved(handler);
    }
  };
}

export { EditorAPI, registerEditorBridge };
