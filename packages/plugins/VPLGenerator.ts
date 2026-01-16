import { Components, GameObject, Mathf, Scene } from "@trident/core";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";

export type VPL = {
    position: Mathf.Vector3;
    direction: Mathf.Vector3;
    color: Mathf.Color;
    intensity: number;
    range: number;
    clusterPopulation: number;
};

export type VPLGeneratorOptions = {
    explorationPoints?: number;
    maxSpawnedVPLs?: number;
    maxNumVPLs?: number;
    maxLevel?: number;
    spacing?: number;
    offset?: number;
    maxDistance?: number;
    sampleColor?: (hit: { timeOfImpact: number; normal: any; point: Mathf.Vector3; collider?: any }) => Mathf.Color;
};

export type VPLLightOptions = {
    parent?: GameObject;
    enabled?: boolean;
    spotAngleDeg?: number;
};

class VPLSet {
    private buckets: Map<number, VPL[]> = new Map();
    private list: VPL[] = [];

    constructor(private spacing: number) {}

    public get size(): number { return this.list.length; }
    public values(): VPL[] { return this.list; }

    public add(vpl: VPL) {
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

    public removeAt(index: number) {
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

    private static matches(a: VPL, b: VPL, spacing: number): boolean {
        const spacingSq = spacing * spacing;
        return a.position.distanceToSquared(b.position) < spacingSq && a.direction.dot(b.direction) > 0.707;
    }

    private static merge(target: VPL, incoming: VPL) {
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

    private static hashDirection(dir: Mathf.Vector3): number {
        const a = Math.round(dir.x + 1) + 1;
        const b = Math.round(dir.y + 1) + 1;
        const c = Math.round(dir.z + 1) + 1;
        return 100 * a + 10 * b + c;
    }
}

export class VPLGenerator {
    public explorationPoints = 30;
    public maxSpawnedVPLs = 500;
    public maxNumVPLs = 20;
    public maxLevel = 3;
    public spacing = 2.0;
    public offset = 0.0;
    public maxDistance = 1000;

    private vpls = new VPLSet(this.spacing);

    constructor(options: VPLGeneratorOptions = {}) {
        this.applyOptions(options);
    }

    public applyOptions(options: VPLGeneratorOptions) {
        if (options.explorationPoints !== undefined) this.explorationPoints = options.explorationPoints;
        if (options.maxSpawnedVPLs !== undefined) this.maxSpawnedVPLs = options.maxSpawnedVPLs;
        if (options.maxNumVPLs !== undefined) this.maxNumVPLs = options.maxNumVPLs;
        if (options.maxLevel !== undefined) this.maxLevel = options.maxLevel;
        if (options.spacing !== undefined) this.spacing = options.spacing;
        if (options.offset !== undefined) this.offset = options.offset;
        if (options.maxDistance !== undefined) this.maxDistance = options.maxDistance;
        this.vpls = new VPLSet(this.spacing);
    }

    public GenerateFromLight(light: Components.Light, options: VPLGeneratorOptions = {}): VPL[] {
        const baseColor = light.color.clone();
        const baseIntensity = light.intensity;
        return this.Generate(light.gameObject.transform.position.clone(), baseColor, baseIntensity, options);
    }

    public Generate(position: Mathf.Vector3, baseColor: Mathf.Color, baseIntensity: number, options: VPLGeneratorOptions = {}): VPL[] {
        if (!PhysicsRapier.hasLoaded) {
            throw new Error("PhysicsRapier is not loaded. Add PhysicsRapier component and call Load().");
        }

        const opts = Object.assign({
            sampleColor: () => baseColor.clone()
        }, options);

        this.applyOptions(options);

        const points: Mathf.Vector3[] = [];
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

    public CreateLights(scene: Scene, vpls: VPL[], options: VPLLightOptions = {}): GameObject[] {
        const group = options.parent ?? new GameObject(scene);
        if (!options.parent) group.name = "VPLs";

        const enabled = options.enabled ?? false;
        const angleDeg = options.spotAngleDeg ?? 160;
        const angleRad = (angleDeg * Mathf.Deg2Rad) * 0.5;

        const lights: GameObject[] = [];
        for (const vpl of vpls) {
            const lightGO = new GameObject(scene);
            lightGO.transform.position.copy(vpl.position).sub(vpl.direction.clone().mul(this.offset));
            lightGO.transform.LookAtV1(lightGO.transform.position.clone().add(vpl.direction));
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

    private traceFeeler(
        pos: Mathf.Vector3,
        dir: Mathf.Vector3,
        level: number,
        baseColor: Mathf.Color,
        baseIntensity: number,
        sampleColor: (hit: { timeOfImpact: number; normal: any; point: Mathf.Vector3; collider?: any }) => Mathf.Color
    ) {
        if (level > this.maxLevel) return;

        const hit = VPLGenerator.raycast(pos, dir, this.maxDistance);
        if (!hit) return;

        const point = hit.point;
        const normal = new Mathf.Vector3(hit.normal.x, hit.normal.y, hit.normal.z).normalize();
        const sampledColor = sampleColor ? sampleColor(hit) : baseColor.clone();

        const vpl: VPL = {
            position: point,
            direction: normal,
            color: sampledColor ?? baseColor.clone(),
            intensity: baseIntensity,
            range: hit.timeOfImpact,
            clusterPopulation: 1
        };

        this.vpls.add(vpl);

        let newDir = VPLGenerator.randomUnitVector();
        if (newDir.dot(vpl.direction) < 0) newDir.mul(-1);

        const nextPos = point.clone().add(vpl.direction.clone().mul(0.001));
        this.traceFeeler(nextPos, newDir, level + 1, baseColor, baseIntensity, sampleColor);
    }

    private filterVPLs() {
        while (this.vpls.size > this.maxNumVPLs) {
            const idx = Math.floor(Mathf.RandomRange(0, this.vpls.size));
            this.vpls.removeAt(idx);
        }
    }

    private static raycast(origin: Mathf.Vector3, direction: Mathf.Vector3, maxDistance: number) {
        const dir = direction.clone().normalize();
        const ray = new PhysicsRapier.Physics.Ray(origin, dir);
        const hit = PhysicsRapier.PhysicsWorld.castRayAndGetNormal(ray, maxDistance, true);
        if (!hit) return null;
        return {
            timeOfImpact: hit.timeOfImpact,
            normal: hit.normal,
            point: VPLGenerator.rayPoint(origin, dir, hit.timeOfImpact),
            collider: hit.collider
        };
    }

    private static rayPoint(origin: Mathf.Vector3, direction: Mathf.Vector3, t: number): Mathf.Vector3 {
        return origin.clone().add(direction.clone().mul(t));
    }

    private static randomUnitVector(): Mathf.Vector3 {
        const z = Mathf.RandomRange(-1, 1);
        const t = Mathf.RandomRange(0, Math.PI * 2);
        const r = Math.sqrt(Math.max(0, 1 - z * z));
        return new Mathf.Vector3(r * Math.cos(t), r * Math.sin(t), z);
    }
}






export class FakeGI extends Components.Component {
    public useRaycasting = false;
    public secondaryBounce = false;
    public useIndirectShadows = false;
    public automaticWeights = false;
    public distanceScale = 1.0;
    public avgRefl = 0.4;
    public avgSecondaryDistance = 1.0;
    public minIntensity = 0.0;
    public forceEnable = false;

    public smooth = true;

    private lights: Components.Light[] = [];
    private reflectance: Mathf.Color[] = [];
    private weights: number[] = [];
    private blockers: Components.Light[] = [];
    private isDirectional = false;
    private isSpot = false;

    private oldVplPos = new Mathf.Vector3();
    private oldVplNormal = new Mathf.Vector3();

    private source: Components.Light;
    private dynamicVplGo: GameObject;
    private dynamicVpl: Components.SpotLight;
    private dynamicVplSecondaryGo: GameObject;
    private dynamicVplSecondary: Components.SpotLight;

    private static k = 0;
    private static dMin = 100000.0;

    public RefreshVPLs() {
        this.lights = [];
        this.reflectance = [];
        this.weights = [];
        this.blockers = [];
        this.getAllVPLs();
        this.getAllBlockers();
    }

    public Start() {
        this.source = this.gameObject.GetComponent(Components.Light);
        if (!this.source) throw new Error("FakeGI requires a Light on the same GameObject.");

        this.isDirectional = this.source instanceof Components.DirectionalLight;
        this.isSpot = this.source instanceof Components.SpotLight;

        if (!this.isSpot && this.useRaycasting) {
            this.useRaycasting = false;
            console.warn("FakeGI: raycasting is only supported for spot lights. Disabled.");
        }

        this.RefreshVPLs();

        if (this.useRaycasting) {
            this.dynamicVplGo = new GameObject(this.gameObject.scene);
            this.dynamicVpl = this.dynamicVplGo.AddComponent(Components.SpotLight);
            this.dynamicVpl.angle = 155 * Mathf.Deg2Rad * 0.5;
            this.dynamicVplGo.name = "DynamicVPL";
            this.dynamicVpl.enabled = false;

            this.oldVplNormal = FakeGI.getForward(this.source.gameObject);
            this.oldVplPos.set(0, 0, 0);

            this.dynamicVpl.castShadows = this.useIndirectShadows;
        }

        if (this.secondaryBounce) {
            this.dynamicVplSecondaryGo = new GameObject(this.gameObject.scene);
            this.dynamicVplSecondary = this.dynamicVplSecondaryGo.AddComponent(Components.SpotLight);
            this.dynamicVplSecondary.angle = 160 * Mathf.Deg2Rad * 0.5;
            this.dynamicVplSecondaryGo.name = "DynamicVPL-secondary";
            this.dynamicVplSecondary.range = (this.source as Components.SpotLight)?.range ?? 10;
            this.dynamicVplSecondary.enabled = false;
        }
    }

    public Update() {
        if (this.lights.length === 0) this.RefreshVPLs();
        if (this.automaticWeights) this.updateWeightsAmortized();

        const sourceDir = FakeGI.getForward(this.source.gameObject);
        const sourcePos = this.source.gameObject.transform.position.clone();
        const sourceIntensity = this.source.intensity;
        const sourceColor = this.source.color.clone();

        if (this.useRaycasting) {
            if (!PhysicsRapier.hasLoaded) return;

            const maxDistance = (this.source as Components.SpotLight)?.range ?? 100;
            const hit = FakeGI.raycast(sourcePos, sourceDir, maxDistance);
            if (!hit) {
                this.dynamicVpl.enabled = false;
                return;
            }

            const dist = hit.timeOfImpact / this.distanceScale;
            let intensity = sourceIntensity / (0.1 + dist * dist);

            if (this.oldVplPos.length() === 0) this.oldVplPos.copy(hit.point);
            const dvplPos = this.smooth
                ? hit.point.clone().add(this.oldVplPos).mul(0.5)
                : hit.point.clone();
            this.oldVplPos.copy(dvplPos);

            const dvplDirPos = dvplPos.clone().add(sourceDir.clone().mul(0.6));
            this.dynamicVplGo.transform.position.copy(dvplDirPos);
            this.dynamicVpl.color.set(0, 0, 0, 1);

            let wTotal = 0.0;
            let areaFactor = 0.0;
            const vplNormal = new Mathf.Vector3(0, 0, 0);

            for (let i = 0; i < this.lights.length; i++) {
                const lightPos = this.lights[i].gameObject.transform.position;
                const toVpl = lightPos.clone().sub(dvplPos);
                const vplDist = toVpl.length() / this.distanceScale;
                const w = 1.0 / (0.005 + vplDist * vplDist);

                const c = this.lights[i].color;
                this.dynamicVpl.color.set(
                    this.dynamicVpl.color.r + w * c.r,
                    this.dynamicVpl.color.g + w * c.g,
                    this.dynamicVpl.color.b + w * c.b,
                    1
                );
                areaFactor += this.weights[i] * w;

                if (this.lights[i] instanceof Components.SpotLight) {
                    vplNormal.add(FakeGI.getForward(this.lights[i].gameObject).mul(w));
                } else {
                    vplNormal.add(sourceDir.clone().mul(-w));
                }

                wTotal += w;
            }

            if (wTotal > 0) {
                this.dynamicVpl.color.set(
                    (this.dynamicVpl.color.r * sourceColor.r) / wTotal,
                    (this.dynamicVpl.color.g * sourceColor.g) / wTotal,
                    (this.dynamicVpl.color.b * sourceColor.b) / wTotal,
                    1
                );
            }

            vplNormal.normalize();
            const smoothNormal = this.smooth
                ? this.oldVplNormal.clone().add(vplNormal).mul(0.5)
                : vplNormal.clone();
            this.oldVplNormal.copy(smoothNormal);

            this.dynamicVplGo.transform.LookAtV1(dvplPos.clone().add(smoothNormal));
            this.dynamicVpl.enabled = true;

            const cosThetaI = Math.max(smoothNormal.dot(sourceDir.clone().mul(-1)), 0);
            intensity *= cosThetaI * (areaFactor / Math.max(wTotal, 1e-4));
            this.dynamicVpl.intensity = intensity;

            if (this.secondaryBounce && this.dynamicVplSecondary) {
                const primDist = hit.timeOfImpact;
                const secDist = (0.5 * primDist + hit.timeOfImpact) / this.distanceScale;
                const secInt = this.avgRefl * intensity / (1.0 + secDist * secDist);
                this.dynamicVplSecondary.color.copy(this.dynamicVpl.color);
                this.dynamicVplSecondaryGo.transform.LookAtV1(dvplPos.clone().sub(smoothNormal));

                const secPos = dvplPos.clone().sub(sourceDir.clone().mul(hit.timeOfImpact * 1.5));
                this.dynamicVplSecondaryGo.transform.position.copy(secPos);
                this.dynamicVplSecondary.enabled = true;
                this.dynamicVplSecondary.intensity = secInt;
            }
            return;
        }

        let secIntensity = 0.0;
        const secPos = new Mathf.Vector3();
        const secDir = new Mathf.Vector3();
        const secColor = new Mathf.Color();
        let secWeight = 0.0;

        for (let i = 0; i < this.lights.length; i++) {
            const lightPos = this.lights[i].gameObject.transform.position;
            const toVpl = this.isDirectional ? sourceDir.clone() : lightPos.clone().sub(sourcePos);
            const toVplNorm = toVpl.clone().normalize();
            let dot = toVplNorm.dot(sourceDir);

            let intensity = sourceIntensity * this.weights[i];
            if (this.isSpot && this.source instanceof Components.SpotLight) {
                const angleCos = Math.cos(this.source.angle * 2.0);
                intensity *= Math.max(0.0, (dot - angleCos) / (1.0 - angleCos));
            }
            if (!this.isDirectional) {
                const dist = toVpl.length() / this.distanceScale;
                intensity *= 1.0 / (0.1 + dist * dist);
            }

            if (this.isSpot || this.isDirectional) {
                const vplNormal = FakeGI.getForward(this.lights[i].gameObject);
                dot = Math.max(0.0, toVplNorm.dot(vplNormal.clone().mul(-1)));
                intensity *= dot;
            }

            if (this.blockers.length > 0) {
                const endpoint = this.isDirectional
                    ? lightPos.clone().sub(toVplNorm.clone().mul(100.0))
                    : sourcePos;

                for (let j = 0; j < this.blockers.length; j++) {
                    const blockerPos = this.blockers[j].gameObject.transform.position;
                    const distToBlocker = FakeGI.pointToSegmentDistanceSquared(blockerPos, endpoint, lightPos);
                    const range = (this.blockers[j] as Components.PointLight)?.range
                        ?? (this.blockers[j] as Components.SpotLight)?.range
                        ?? 1.0;
                    const filter = Math.min(1.0, distToBlocker / (0.0001 + range * range));
                    intensity *= filter;
                }
            }

            if (intensity <= this.minIntensity && !this.forceEnable) {
                this.lights[i].enabled = false;
            } else {
                this.lights[i].enabled = true;
                this.lights[i].intensity = Math.max(intensity, this.minIntensity);
                const rc = this.reflectance[i];
                this.lights[i].color.set(
                    rc.r * sourceColor.r,
                    rc.g * sourceColor.g,
                    rc.b * sourceColor.b,
                    1
                );
            }

            if (this.secondaryBounce) {
                const w = intensity / Math.max(sourceIntensity, 1e-4);
                secIntensity += w * this.avgRefl * intensity;
                secColor.set(
                    secColor.r + w * this.lights[i].color.r,
                    secColor.g + w * this.lights[i].color.g,
                    secColor.b + w * this.lights[i].color.b,
                    1
                );
                secPos.add(lightPos.clone().mul(w));
                secDir.sub(FakeGI.getForward(this.lights[i].gameObject).mul(w));
                secWeight += w + 0.001;
            }
        }

        if (this.secondaryBounce && this.dynamicVplSecondary) {
            this.dynamicVplSecondaryGo.transform.position.copy(secPos.div(secWeight).sub(sourceDir.clone().mul(this.avgSecondaryDistance)));
            this.dynamicVplSecondaryGo.transform.LookAtV1(this.dynamicVplSecondaryGo.transform.position.clone().add(secDir.normalize()));
            this.dynamicVplSecondary.intensity = secIntensity / (secWeight * this.avgSecondaryDistance * this.avgSecondaryDistance);
            this.dynamicVplSecondary.color.set(secColor.r / secWeight, secColor.g / secWeight, secColor.b / secWeight, 1);
            this.dynamicVplSecondary.enabled = true;
        }
    }

    private updateWeightsAmortized() {
        if (this.lights.length === 1) {
            this.weights[0] = 1.0;
            return;
        }

        const current = FakeGI.k % this.lights.length;
        const other = Math.floor(FakeGI.k / this.lights.length);

        if (other === 0) FakeGI.dMin = 100000.0;

        if (current === other) {
            FakeGI.k = (FakeGI.k + 1) % (this.lights.length * this.lights.length);
            return;
        }

        const v = this.lights[current].gameObject.transform.position.clone().sub(this.lights[other].gameObject.transform.position);
        const d = v.dot(v);
        if (d < FakeGI.dMin) FakeGI.dMin = d;

        if (other === this.lights.length - 1) {
            this.weights[current] = FakeGI.dMin;
        }

        FakeGI.k = (FakeGI.k + 1) % (this.lights.length * this.lights.length);
    }

    private getAllBlockers() {
        const scene = this.gameObject.scene;
        for (const go of scene.GetGameObjects()) {
            if (go.name !== "BLOCKERS") continue;
            for (const child of go.transform.children) {
                const l = child.gameObject.GetComponent(Components.Light);
                if (!l) continue;
                l.enabled = false;
                this.blockers.push(l);
            }
        }
    }

    private getAllVPLs() {
        const scene = this.gameObject.scene;
        for (const go of scene.GetGameObjects()) {
            if (go.name !== "VPLs" || !go.enabled) continue;
            for (const child of go.transform.children) {
                const l = child.gameObject.GetComponent(Components.Light);
                if (!l) continue;

                if (l instanceof Components.SpotLight && this.source instanceof Components.SpotLight) {
                    l.angle = 170 * Mathf.Deg2Rad * 0.5;
                    l.range = this.source.range;
                }

                this.weights.push(l.intensity);
                l.intensity = 0.0;
                l.enabled = false;
                this.lights.push(l);
                this.reflectance.push(l.color.clone());
                l.castShadows = this.useIndirectShadows;
            }
        }
    }

    private static pointToSegmentDistanceSquared(q: Mathf.Vector3, x0: Mathf.Vector3, x1: Mathf.Vector3): number {
        const dir = x1.clone().sub(x0);
        const dirLen = dir.length();
        if (dirLen === 0) return q.distanceToSquared(x0);
        const dirNorm = dir.clone().div(dirLen);
        const lq = dirNorm.dot(q.clone().sub(x0));
        if (lq < 0.0) return q.distanceToSquared(x0);
        if (lq > dirLen) return q.distanceToSquared(x1);
        const o = dirNorm.mul(lq).add(x0).sub(q);
        return o.dot(o);
    }

    private static getForward(go: GameObject): Mathf.Vector3 {
        return new Mathf.Vector3(0, 0, 1).applyQuaternion(go.transform.rotation).normalize();
    }

    private static raycast(origin: Mathf.Vector3, direction: Mathf.Vector3, maxDistance: number) {
        const dir = direction.clone().normalize();
        const ray = new PhysicsRapier.Physics.Ray(origin, dir);
        const hit = PhysicsRapier.PhysicsWorld.castRayAndGetNormal(ray, maxDistance, true);
        if (!hit) return null;
        const point = origin.clone().add(dir.clone().mul(hit.timeOfImpact));
        return { timeOfImpact: hit.timeOfImpact, normal: hit.normal, point, collider: hit.collider };
    }
}
