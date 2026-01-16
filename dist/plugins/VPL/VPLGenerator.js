import { Mathf, GameObject, Components } from '@trident/core';
import { PhysicsRapier } from '@trident/plugins/PhysicsRapier/PhysicsRapier.js';

class VPLSet {
  constructor(spacing) {
    this.spacing = spacing;
  }
  buckets = /* @__PURE__ */ new Map();
  list = [];
  get size() {
    return this.list.length;
  }
  values() {
    return this.list;
  }
  add(vpl) {
    const key = VPLSet.hashDirection(vpl.direction);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    for (const existing of bucket) {
      if (VPLSet.matches(existing, vpl, this.spacing)) {
        VPLSet.merge(existing, vpl);
        return;
      }
    }
    bucket.push(vpl);
    this.list.push(vpl);
  }
  removeAt(index) {
    if (index < 0 || index >= this.list.length) return;
    const vpl = this.list[index];
    this.list.splice(index, 1);
    const key = VPLSet.hashDirection(vpl.direction);
    const bucket = this.buckets.get(key);
    if (!bucket) return;
    const i = bucket.indexOf(vpl);
    if (i !== -1) bucket.splice(i, 1);
    if (bucket.length === 0) this.buckets.delete(key);
  }
  static matches(a, b, spacing) {
    const spacingSq = spacing * spacing;
    return a.position.distanceToSquared(b.position) < spacingSq && a.direction.dot(b.direction) > 0.707;
  }
  static merge(target, incoming) {
    const total = target.clusterPopulation + 1;
    const wOld = target.clusterPopulation / total;
    const wNew = 1 / total;
    target.position.mul(wOld).add(incoming.position.clone().mul(wNew));
    target.direction.mul(wOld).add(incoming.direction.clone().mul(wNew)).normalize();
    target.intensity = target.intensity * wOld + incoming.intensity * wNew;
    target.color.set(
      target.color.r * wOld + incoming.color.r * wNew,
      target.color.g * wOld + incoming.color.g * wNew,
      target.color.b * wOld + incoming.color.b * wNew,
      target.color.a * wOld + incoming.color.a * wNew
    );
    target.range = target.range * wOld + incoming.range * wNew;
    target.clusterPopulation = total;
  }
  static hashDirection(dir) {
    const a = Math.round(dir.x + 1) + 1;
    const b = Math.round(dir.y + 1) + 1;
    const c = Math.round(dir.z + 1) + 1;
    return 100 * a + 10 * b + c;
  }
}
class VPLGenerator {
  explorationPoints = 30;
  maxSpawnedVPLs = 500;
  maxNumVPLs = 20;
  maxLevel = 3;
  spacing = 2;
  offset = 0;
  maxDistance = 1e3;
  vpls = new VPLSet(this.spacing);
  constructor(options = {}) {
    this.applyOptions(options);
  }
  applyOptions(options) {
    if (options.explorationPoints !== void 0) this.explorationPoints = options.explorationPoints;
    if (options.maxSpawnedVPLs !== void 0) this.maxSpawnedVPLs = options.maxSpawnedVPLs;
    if (options.maxNumVPLs !== void 0) this.maxNumVPLs = options.maxNumVPLs;
    if (options.maxLevel !== void 0) this.maxLevel = options.maxLevel;
    if (options.spacing !== void 0) this.spacing = options.spacing;
    if (options.offset !== void 0) this.offset = options.offset;
    if (options.maxDistance !== void 0) this.maxDistance = options.maxDistance;
    this.vpls = new VPLSet(this.spacing);
  }
  GenerateFromLight(light, options = {}) {
    const baseColor = light.color.clone();
    const baseIntensity = light.intensity;
    return this.Generate(light.gameObject.transform.position.clone(), baseColor, baseIntensity, options);
  }
  Generate(position, baseColor, baseIntensity, options = {}) {
    if (!PhysicsRapier.hasLoaded) {
      throw new Error("PhysicsRapier is not loaded. Add PhysicsRapier component and call Load().");
    }
    const opts = Object.assign({
      sampleColor: () => baseColor.clone()
    }, options);
    this.applyOptions(options);
    const points = [];
    points[0] = position.clone();
    let nextPoint = 1;
    for (let k = 0; k < this.explorationPoints; k++) {
      const cur = points[Math.floor(Mathf.RandomRange(0, nextPoint))];
      const dir = VPLGenerator.randomUnitVector();
      const hit = VPLGenerator.raycast(cur, dir, this.maxDistance);
      if (!hit) continue;
      const hitPoint = VPLGenerator.rayPoint(cur, dir, hit.timeOfImpact);
      points[nextPoint++] = cur.clone().add(hitPoint.clone().sub(cur).mul(0.5));
    }
    const perPoint = Math.max(1, Math.floor(this.maxSpawnedVPLs / Math.max(1, this.maxLevel * nextPoint)));
    for (let k = 0; k < nextPoint; k++) {
      for (let i = 0; i < perPoint; i++) {
        this.traceFeeler(points[k], VPLGenerator.randomUnitVector(), 0, baseColor, baseIntensity, opts.sampleColor);
      }
    }
    this.filterVPLs();
    return this.vpls.values();
  }
  CreateLights(scene, vpls, options = {}) {
    const group = options.parent ?? new GameObject(scene);
    if (!options.parent) group.name = "VPLs";
    const enabled = options.enabled ?? false;
    const angleDeg = options.spotAngleDeg ?? 160;
    const angleRad = angleDeg * Mathf.Deg2Rad * 0.5;
    const lights = [];
    for (const vpl of vpls) {
      const lightGO = new GameObject(scene);
      lightGO.transform.position.copy(vpl.position).sub(vpl.direction.clone().mul(this.offset));
      lightGO.transform.LookAt(lightGO.transform.position.clone().add(vpl.direction));
      lightGO.transform.parent = group.transform;
      const light = lightGO.AddComponent(Components.SpotLight);
      light.angle = angleRad;
      light.range = vpl.range;
      light.intensity = vpl.intensity;
      light.color.copy(vpl.color);
      light.enabled = enabled;
      lights.push(lightGO);
    }
    return lights;
  }
  traceFeeler(pos, dir, level, baseColor, baseIntensity, sampleColor) {
    if (level > this.maxLevel) return;
    const hit = VPLGenerator.raycast(pos, dir, this.maxDistance);
    if (!hit) return;
    const point = VPLGenerator.rayPoint(pos, dir, hit.timeOfImpact);
    const normal = new Mathf.Vector3(hit.normal.x, hit.normal.y, hit.normal.z).normalize();
    const vpl = {
      position: point,
      direction: normal,
      color: sampleColor(hit) ?? baseColor.clone(),
      intensity: baseIntensity,
      range: hit.timeOfImpact,
      clusterPopulation: 1
    };
    this.vpls.add(vpl);
    let newDir = VPLGenerator.randomUnitVector();
    if (newDir.dot(vpl.direction) < 0) newDir.mul(-1);
    const nextPos = point.clone().add(vpl.direction.clone().mul(1e-3));
    this.traceFeeler(nextPos, newDir, level + 1, baseColor, baseIntensity, sampleColor);
  }
  filterVPLs() {
    while (this.vpls.size > this.maxNumVPLs) {
      const idx = Math.floor(Mathf.RandomRange(0, this.vpls.size));
      this.vpls.removeAt(idx);
    }
  }
  static raycast(origin, direction, maxDistance) {
    const dir = direction.clone().normalize();
    const ray = new PhysicsRapier.Physics.Ray(origin, dir);
    return PhysicsRapier.PhysicsWorld.castRayAndGetNormal(ray, maxDistance, true);
  }
  static rayPoint(origin, direction, t) {
    return origin.clone().add(direction.clone().mul(t));
  }
  static randomUnitVector() {
    const z = Mathf.RandomRange(-1, 1);
    const t = Mathf.RandomRange(0, Math.PI * 2);
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    return new Mathf.Vector3(r * Math.cos(t), r * Math.sin(t), z);
  }
}

export { VPLGenerator };
