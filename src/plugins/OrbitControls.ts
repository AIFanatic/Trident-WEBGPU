import { Camera } from "../components/Camera"
import { Vector3 } from "../math/Vector3"

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
enum BUTTONS {
    NONE = 0,
    LEFT = 1,
    RIGHT = 2,
}

const _v = new Vector3()

/**
 * Orbital controls that revolve a camera around a point.
 */
export class OrbitControls {
    /** The center point to orbit around. Default is `0, 0, 0` */
    readonly center = new Vector3()
    public orbitSpeed = 1
    public panSpeed = 10
    public enableZoom = true
    public enablePan = true
    public minRadius = 0
    public maxRadius = Infinity
    public minTheta = -Infinity
    public maxTheta = Infinity
    public minPhi = 0
    public maxPhi = Math.PI
    private _camera: Camera
    private _element: HTMLElement | null = null
    private _pointers = new Map<number, PointerEvent>()

    private get _focused(): boolean {
        return document.activeElement === this._element
    }

    constructor(camera: Camera) {
        this._camera = camera
        this._camera.transform.LookAt(this.center)

        // Ensure methods don't descope and re-inherit `this`
        const properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        for (const property of properties) {
            // @ts-ignore
            if (typeof this[property] === 'function') this[property] = this[property].bind(this)
        }
    }

    /**
     * Adjusts camera orbital zoom.
     */
    zoom(scale: number): void {
        const radius = this._camera.transform.position.sub(this.center).length()
        this._camera.transform.position.mul(
            scale * (Math.min(this.maxRadius, Math.max(this.minRadius, radius * scale)) / (radius * scale)),
        )
        this._camera.transform.position.add(this.center)
    }

    /**
     * Adjusts camera orbital position.
     */
    orbit(deltaX: number, deltaY: number): void {
        const offset = this._camera.transform.position.sub(this.center)
        const radius = offset.length()

        const deltaPhi = deltaY * (this.orbitSpeed / this._element!.clientHeight)
        const deltaTheta = deltaX * (this.orbitSpeed / this._element!.clientHeight)

        const phi = Math.min(this.maxPhi, Math.max(this.minPhi, Math.acos(offset.y / radius) - deltaPhi)) || Number.EPSILON
        const theta =
            Math.min(this.maxTheta, Math.max(this.minTheta, Math.atan2(offset.z, offset.x) + deltaTheta)) || Number.EPSILON

        this._camera.transform.position
            .set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
            .mul(radius)

        this._camera.transform.position.add(this.center)
        this._camera.transform.LookAt(this.center)
    }

    /**
     * Adjusts orthogonal camera pan.
     */
    pan(deltaX: number, deltaY: number): void {
        this._camera.transform.position.sub(this.center)
        this.center.add(
            _v
                .set(-deltaX, deltaY, 0)
                .applyQuaternion(this._camera.transform.rotation)
                .mul(this.panSpeed / this._element!.clientHeight),
        )
        this._camera.transform.position.add(this.center)
    }

    private _onContextMenu(event: MouseEvent): void {
        event.preventDefault()
    }

    private _onScroll(event: WheelEvent): void {
        if (!this.enableZoom || !this._focused) return

        this.zoom(1 + event.deltaY / 720)
    }

    private _onPointerMove(event: PointerEvent): void {
        if (!this._focused) return

        const prevPointer = this._pointers.get(event.pointerId)!
        if (prevPointer) {
            const deltaX = (event.pageX - prevPointer.pageX) / this._pointers.size
            const deltaY = (event.pageY - prevPointer.pageY) / this._pointers.size

            const type = event.pointerType === 'touch' ? this._pointers.size : event.buttons
            if (type === BUTTONS.LEFT) {
                this._element!.style.cursor = 'grabbing'
                this.orbit(deltaX, deltaY)
            } else if (type === BUTTONS.RIGHT) {
                this._element!.style.cursor = 'grabbing'
                if (this.enablePan) this.pan(deltaX, deltaY)
            }
        } else if (event.pointerType !== 'touch') {
            this._element!.setPointerCapture(event.pointerId)
        }

        this._pointers.set(event.pointerId, event);

    }

    private _onPointerUp(event: PointerEvent): void {
        this._element!.style.cursor = 'grab'
        this._element!.style.touchAction = this.enableZoom || this.enablePan ? 'none' : 'pinch-zoom'
        if (event.pointerType !== 'touch') this._element!.releasePointerCapture(event.pointerId)
        this._pointers.delete(event.pointerId)
    }

    /**
     * Connects controls' event handlers, enabling interaction.
     */
    connect(element: HTMLElement): void {
        element.addEventListener('contextmenu', this._onContextMenu)
        element.addEventListener('wheel', this._onScroll, { passive: true })
        element.addEventListener('pointermove', this._onPointerMove)
        element.addEventListener('pointerup', this._onPointerUp)
        element.tabIndex = 0
        this._element = element
        this._element.style.cursor = 'grab'
    }
}
