const createElement = (type, props, ...children) => {
  if (props === null) props = {};
  if (children.length === 0 && props.children !== void 0) children = props.children;
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
  static File = {
    WriteAllBytes(path, bytes) {
      return requireBridge().writeFile(path, bytes);
    },
    WriteAllText(path, text) {
      return requireBridge().writeFile(path, text);
    }
  };
  static CreateElement(type, props, ...children) {
    return createElement(type, props, ...children);
  }
  static RepaintInspector() {
    return requireBridge().repaintInspector();
  }
  static LayoutInspectorInput(props) {
    return requireBridge().LayoutInspectorInput(props);
  }
  static LayoutInspectorProperty(props) {
    return requireBridge().LayoutInspectorProperty(props);
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
    },
    onHierarchySelected(handler) {
      return requireBridge().events.onHierarchySelected(handler);
    },
    offHierarchySelected(handler) {
      return requireBridge().events.offHierarchySelected(handler);
    }
  };
  static Selection = {
    get activeGameObject() {
      return requireBridge().Selection.activeGameObject;
    }
  };
}

export { EditorAPI, registerEditorBridge };
