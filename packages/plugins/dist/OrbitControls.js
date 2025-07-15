import { Mathf } from "@trident/core";
// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
var BUTTONS;
(function (BUTTONS) {
    BUTTONS[BUTTONS["NONE"] = 0] = "NONE";
    BUTTONS[BUTTONS["LEFT"] = 1] = "LEFT";
    BUTTONS[BUTTONS["RIGHT"] = 2] = "RIGHT";
})(BUTTONS || (BUTTONS = {}));
const _v = new Mathf.Vector3();
/**
 * Orbital controls that revolve a camera around a point.
 */
export class OrbitControls {
    domElement;
    /** The center point to orbit around. Default is `0, 0, 0` */
    center = new Mathf.Vector3();
    orbitSpeed = 0.01;
    panSpeed = 10;
    enableZoom = true;
    enablePan = true;
    minRadius = 0;
    maxRadius = Infinity;
    minTheta = -Infinity;
    maxTheta = Infinity;
    minPhi = 0;
    maxPhi = Math.PI;
    _camera;
    _element;
    _pointers = new Map();
    constructor(domElement, camera) {
        this.domElement = domElement;
        this.domElement.style.touchAction = 'none';
        this._camera = camera;
        this._camera.transform.LookAtV1(this.center);
        domElement.addEventListener('contextmenu', event => { this._onContextMenu(event); });
        domElement.addEventListener('wheel', event => { this._onScroll(event); }, { passive: true });
        domElement.addEventListener('pointermove', event => { this._onPointerMove(event); });
        domElement.addEventListener('pointerup', event => { this._onPointerUp(event); });
        domElement.tabIndex = 0;
        this._element = domElement;
        this._element.style.cursor = 'grab';
    }
    /**
     * Adjusts camera orbital zoom.
     */
    zoom(scale) {
        const radius = this._camera.transform.position.sub(this.center).length();
        this._camera.transform.position.mul(scale * (Math.min(this.maxRadius, Math.max(this.minRadius, radius * scale)) / (radius * scale)));
        this._camera.transform.position.add(this.center);
    }
    /**
     * Adjusts camera orbital position.
     */
    x = 0;
    y = 0;
    orbit(deltaX, deltaY) {
        const distance = this._camera.transform.position.distanceTo(this.center);
        // const distance = this.center.distanceTo(this._camera.transform.position);
        this.x -= deltaX * this.orbitSpeed;
        this.y -= deltaY * this.orbitSpeed;
        const rotation = new Mathf.Quaternion().fromEuler(new Mathf.Vector3(this.y, this.x, 0));
        const position = new Mathf.Vector3(0.0, 0.0, distance).applyQuaternion(rotation).add(this.center);
        this._camera.transform.rotation.copy(rotation);
        this._camera.transform.position.copy(position);
    }
    /**
     * Adjusts orthogonal camera pan.
     */
    pan(deltaX, deltaY) {
        this._camera.transform.position.sub(this.center);
        this.center.add(_v
            .set(-deltaX, deltaY, 0)
            .applyQuaternion(this._camera.transform.rotation)
            .mul(this.panSpeed / this._element.clientHeight));
        this._camera.transform.position.add(this.center);
    }
    _onContextMenu(event) {
        event.preventDefault();
    }
    _onScroll(event) {
        this.zoom(1 + event.deltaY / 720);
    }
    _onPointerMove(event) {
        const prevPointer = this._pointers.get(event.pointerId);
        if (prevPointer) {
            const deltaX = (event.pageX - prevPointer.pageX) / this._pointers.size;
            const deltaY = (event.pageY - prevPointer.pageY) / this._pointers.size;
            const type = event.pointerType === 'touch' ? this._pointers.size : event.buttons;
            if (type === BUTTONS.LEFT) {
                this._element.style.cursor = 'grabbing';
                this.orbit(deltaX, deltaY);
            }
            else if (type === BUTTONS.RIGHT) {
                this._element.style.cursor = 'grabbing';
                if (this.enablePan)
                    this.pan(deltaX, deltaY);
            }
            if (event.pointerType === 'touch' && this._pointers.size === 2) {
                // Get the other pointer
                const otherPointer = Array.from(this._pointers.values()).find(p => p.pointerId !== event.pointerId);
                if (otherPointer) {
                    const currentDistance = Math.hypot(event.pageX - otherPointer.pageX, event.pageY - otherPointer.pageY);
                    const previousDistance = Math.hypot(prevPointer.pageX - otherPointer.pageX, prevPointer.pageY - otherPointer.pageY);
                    const zoomFactor = previousDistance / currentDistance;
                    this.zoom(zoomFactor);
                }
            }
        }
        else if (event.pointerType == 'touch') {
            this._element.setPointerCapture(event.pointerId);
        }
        this._pointers.set(event.pointerId, event);
    }
    _onPointerUp(event) {
        this._element.style.cursor = 'grab';
        this._element.style.touchAction = this.enableZoom || this.enablePan ? 'none' : 'pinch-zoom';
        if (event.pointerType == 'touch')
            this._element.releasePointerCapture(event.pointerId);
        this._pointers.delete(event.pointerId);
    }
}
