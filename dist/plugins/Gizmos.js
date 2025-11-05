import { Scene, GameObject } from '@trident/core';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';

class Gizmos {
  static GameObject;
  static LineRenderer;
  static init() {
    if (Gizmos.GameObject) return;
    const mainScene = Scene.mainScene;
    if (!mainScene) throw Error("Cannot initialize gizmos as there is no main scene.");
    Gizmos.GameObject = new GameObject(mainScene);
    Gizmos.LineRenderer = Gizmos.GameObject.AddComponent(LineRenderer);
    console.log("CALLED");
  }
  static DrawLine(from, to) {
    Gizmos.init();
    Gizmos.LineRenderer.SetPositions([from, to]);
  }
}

export { Gizmos };
