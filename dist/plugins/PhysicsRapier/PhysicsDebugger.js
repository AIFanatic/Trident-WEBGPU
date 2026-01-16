import { Component } from '@trident/core';
import { PhysicsRapier } from './PhysicsRapier.js';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';

class PhysicsDebugger extends Component {
  updateRate = 1e3;
  Start() {
    const line = this.gameObject.AddComponent(LineRenderer);
    setInterval(() => {
      const { vertices, colors } = PhysicsRapier.PhysicsWorld.debugRender();
      line.SetPositions(vertices);
      line.SetColors(colors);
    }, this.updateRate);
  }
}

export { PhysicsDebugger };
