import { GameObject, Components, Geometry, PBRMaterial, Mathf } from '@trident/core';
import { PhysicsRapier } from '@trident/plugins/PhysicsRapier/PhysicsRapier.js';

class VPLGenerator {
  AddSphere(location, color) {
    const g = new GameObject();
    g.transform.position.copy(location);
    const m = g.AddComponent(Components.Mesh);
    m.geometry = Geometry.Sphere();
    m.material = new PBRMaterial({ albedoColor: color, unlit: true });
  }
  static raycast(origin, direction, maxDistance) {
    const dir = direction.clone().normalize();
    const ray = new PhysicsRapier.Physics.Ray(origin, dir);
    const hit = PhysicsRapier.PhysicsWorld.castRayAndGetNormal(ray, maxDistance, true);
    if (!hit) return null;
    return {
      timeOfImpact: hit.timeOfImpact,
      normal: hit.normal,
      point: this.rayPoint(origin, dir, hit.timeOfImpact),
      collider: hit.collider
    };
  }
  static rayPoint(origin, direction, t) {
    return origin.clone().add(direction.clone().mul(t));
  }
  randDirHemisphere(normal, v1, v2) {
    const cosPhi = Math.sqrt(v1);
    const sinPhi = Math.sqrt(1 - v1);
    const theta = v2 * 2 * Math.PI;
    if (normal.dot(normal) < 1e-4) {
      return new Mathf.Vector3(
        sinPhi * Math.cos(theta),
        cosPhi,
        sinPhi * Math.sin(theta)
      );
    }
    let someDirNotNormal;
    if (normal.x < normal.y && normal.x < normal.z) someDirNotNormal = new Mathf.Vector3(1, 0, 0);
    else if (normal.y < normal.z) someDirNotNormal = new Mathf.Vector3(0, 1, 0);
    else someDirNotNormal = new Mathf.Vector3(0, 0, 1);
    const basis1 = new Mathf.Vector3().crossVectors(normal, someDirNotNormal).normalize();
    const basis2 = new Mathf.Vector3().crossVectors(normal, basis1).normalize();
    const a = normal.clone().mul(cosPhi);
    const b = basis1.clone().mul(sinPhi * Math.cos(theta));
    const c = basis2.clone().mul(sinPhi * Math.sin(theta));
    return a.add(b).add(c);
  }
  AddLight(position, color, intensity, range) {
    const go = new GameObject();
    go.transform.position.copy(position);
    const light = go.AddComponent(Components.PointLight);
    light.color.copy(color);
    light.intensity = intensity;
    light.range = range;
  }
  GenerateFromLight(light, sampleColor) {
    const normal = new Mathf.Vector3(0, 0, 0);
    for (let i = 0; i < 256; i++) {
      const v1 = Mathf.Random();
      const v2 = Mathf.Random();
      const dir = this.randDirHemisphere(normal, v1, v2).mul(-1);
      const pos = light.transform.position;
      const ray = VPLGenerator.raycast(pos, dir, 100);
      if (!ray) {
        console.warn("Missed", dir);
        continue;
      }
      const sampledColor = sampleColor(ray);
      console.log(sampledColor);
      console.log("ray", v1, v2, ray);
      const distToHit = pos.distanceTo(ray.point);
      const NdotL = Math.max(
        new Mathf.Vector3(ray.normal.x, ray.normal.y, ray.normal.z).dot(dir.clone().mul(-1).normalize()),
        0
      );
      const irradiance = light.intensity / (distToHit * distToHit);
      const vplIntensity = irradiance * NdotL / Math.PI;
      const epsilon = 0.01;
      const vplRange = Math.sqrt(vplIntensity / epsilon);
      const range = Mathf.Clamp(vplRange, 0.5, 20) * 1.5;
      this.AddLight(ray.point, sampledColor, vplIntensity, range);
    }
  }
}

export { VPLGenerator };
