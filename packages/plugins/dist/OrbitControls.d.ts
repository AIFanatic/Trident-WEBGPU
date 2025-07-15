import { Mathf, Components } from "@trident/core";
/**
 * Orbital controls that revolve a camera around a point.
 */
export declare class OrbitControls {
    private domElement;
    /** The center point to orbit around. Default is `0, 0, 0` */
    readonly center: Mathf.Vector3;
    orbitSpeed: number;
    panSpeed: number;
    enableZoom: boolean;
    enablePan: boolean;
    minRadius: number;
    maxRadius: number;
    minTheta: number;
    maxTheta: number;
    minPhi: number;
    maxPhi: number;
    private _camera;
    private _element;
    private _pointers;
    constructor(domElement: HTMLElement, camera: Components.Camera);
    /**
     * Adjusts camera orbital zoom.
     */
    private zoom;
    /**
     * Adjusts camera orbital position.
     */
    private x;
    private y;
    private orbit;
    /**
     * Adjusts orthogonal camera pan.
     */
    private pan;
    private _onContextMenu;
    private _onScroll;
    private _onPointerMove;
    private _onPointerUp;
}
//# sourceMappingURL=OrbitControls.d.ts.map