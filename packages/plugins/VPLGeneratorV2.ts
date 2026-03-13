import { Components, GameObject, Geometry, Mathf, PBRMaterial, Scene } from "@trident/core";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";

export class VPLGeneratorV2 {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    private AddSphere(location: Mathf.Vector3, color: Mathf.Color) {
        const g = new GameObject(this.scene);
        g.transform.position.copy(location);
        const m = g.AddComponent(Components.Mesh);
        m.geometry = Geometry.Sphere();
        m.material = new PBRMaterial({ albedoColor: color, unlit: true });
    }

    private static raycast(origin: Mathf.Vector3, direction: Mathf.Vector3, maxDistance: number) {
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

    private static rayPoint(origin: Mathf.Vector3, direction: Mathf.Vector3, t: number): Mathf.Vector3 {
        return origin.clone().add(direction.clone().mul(t));
    }

    private randDirHemisphere(normal: Mathf.Vector3, v1: number, v2: number): Mathf.Vector3 {
        const cosPhi = Math.sqrt(v1);
        const sinPhi = Math.sqrt(1.0 - v1);
        const theta = v2 * 2.0 * Math.PI;

        if (normal.dot(normal) < 0.0001) {
            return new Mathf.Vector3(
                sinPhi * Math.cos(theta),
                cosPhi,
                sinPhi * Math.sin(theta)
            );
        }

        let someDirNotNormal: Mathf.Vector3;
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

    private AddLight(position: Mathf.Vector3, color: Mathf.Color, intensity: number, range: number) {
        const go = new GameObject(this.scene);
        go.transform.position.copy(position);
        const light = go.AddComponent(Components.PointLight);
        light.color.copy(color);
        light.intensity = intensity;
        light.range = range;
    }

    public GenerateFromLight(light: Components.PointLight, sampleColor: (hit: { timeOfImpact: number; normal: any; point: Mathf.Vector3; collider?: any }) => Mathf.Color) {
        const normal = new Mathf.Vector3(0, 0, 0);

        for (let i = 0; i < 100; i++) {
            const v1 = Mathf.Random();
            const v2 = Mathf.Random();
            const dir = this.randDirHemisphere(normal, v1, v2).mul(-1);
            const pos = light.transform.position;
            const ray = VPLGeneratorV2.raycast(pos, dir, 100);
            
            if (!ray) {
                console.warn("Missed", dir);
                continue;
            }
            
            const sampledColor = sampleColor(ray);
            console.log(sampledColor);
            console.log("ray", v1, v2, ray)

            // this.AddSphere(ray.point, sampledColor);

            const distToHit = pos.distanceTo(ray.point);
            const NdotL = Math.max(
                new Mathf.Vector3(ray.normal.x, ray.normal.y, ray.normal.z) .dot(dir.clone().mul(-1).normalize()),
                0
            );

            const irradiance = light.intensity / (distToHit * distToHit);
            const vplIntensity = (irradiance * NdotL) / Math.PI; // divide by sample count

            const epsilon = 0.01;
            const vplRange = Math.sqrt(vplIntensity / epsilon);
            const range = Mathf.Clamp(vplRange, 0.5, 20) * 1.5;

            this.AddLight(ray.point, sampledColor, vplIntensity, range);
        }
    }
}