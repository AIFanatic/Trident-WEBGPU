import { EventSystemLocal, SerializeField } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";
import { TerrainData, TerrainDataEvents } from "@trident/plugins/Terrain/Terrain";

export class TerrainCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/TerrainCollider";

    public runInEditMode = true;

    private _terrainData: TerrainData;
    @SerializeField(TerrainData)
    public get terrainData(): TerrainData { return this._terrainData; }
    public set terrainData(td: TerrainData) {
        if (this._terrainData === td) return;
        if (this._terrainData) {
            EventSystemLocal.off(TerrainDataEvents.GeometryUpdated, this._terrainData, this.onGeometryUpdated);
        }
        this._terrainData = td;
        if (!td) return;
        EventSystemLocal.on(TerrainDataEvents.GeometryUpdated, td, this.onGeometryUpdated);
        this.Rebuild(td);
    }

    private onGeometryUpdated = (td: TerrainData) => this.Rebuild(td);

    private Rebuild(terrainData: TerrainData): void {
        if (!PhysicsRapier.PhysicsWorld) return;
        const heights = terrainData.heights;
        if (!heights?.length) return;
        const size = Math.sqrt(heights.length);
        if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(size - 1, size - 1, heights, terrainData.size);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        this.collider.setTranslation(this.transform.position);
        this.collider.setRotation(this.transform.rotation);
    }

    public Destroy(): void {
        if (this._terrainData) EventSystemLocal.off(TerrainDataEvents.GeometryUpdated, this._terrainData, this.onGeometryUpdated);
        if (this.collider && PhysicsRapier.PhysicsWorld) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    }
}