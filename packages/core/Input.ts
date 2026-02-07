import { Vector2 } from "./math/Vector2";
import { Renderer } from "./renderer";

export enum KeyCodes {
    CANCEL = 3,
    HELP = 6,
    BACK_SPACE = 8,
    TAB = 9,
    CLEAR = 12,
    RETURN = 13,
    ENTER = 14,
    SHIFT = 16,
    CONTROL = 17,
    ALT = 18,
    PAUSE = 19,
    CAPS_LOCK = 20,
    ESCAPE = 27,
    SPACE = 32,
    PAGE_UP = 33,
    PAGE_DOWN = 34,
    END = 35,
    HOME = 36,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40,
    PRINTSCREEN = 44,
    INSERT = 45,
    DELETE = 46,
    NUM_0 = 48,
    NUM_1 = 49,
    NUM_2 = 50,
    NUM_3 = 51,
    NUM_4 = 52,
    NUM_5 = 53,
    NUM_6 = 54,
    NUM_7 = 55,
    NUM_8 = 56,
    NUM_9 = 57,
    SEMICOLON = 59,
    EQUALS = 61,
    A = 65,
    B = 66,
    C = 67,
    D = 68,
    E = 69,
    F = 70,
    G = 71,
    H = 72,
    I = 73,
    J = 74,
    K = 75,
    L = 76,
    M = 77,
    N = 78,
    O = 79,
    P = 80,
    Q = 81,
    R = 82,
    S = 83,
    T = 84,
    U = 85,
    V = 86,
    W = 87,
    X = 88,
    Y = 89,
    Z = 90,
    CONTEXT_MENU = 93,
    NUMPAD0 = 96,
    NUMPAD1 = 97,
    NUMPAD2 = 98,
    NUMPAD3 = 99,
    NUMPAD4 = 100,
    NUMPAD5 = 101,
    NUMPAD6 = 102,
    NUMPAD7 = 103,
    NUMPAD8 = 104,
    NUMPAD9 = 105,
    MULTIPLY = 106,
    ADD = 107,
    SEPARATOR = 108,
    SUBTRACT = 109,
    DECIMAL = 110,
    DIVIDE = 111,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123,
    F13 = 124,
    F14 = 125,
    F15 = 126,
    F16 = 127,
    F17 = 128,
    F18 = 129,
    F19 = 130,
    F20 = 131,
    F21 = 132,
    F22 = 133,
    F23 = 134,
    F24 = 135,
    NUM_LOCK = 144,
    SCROLL_LOCK = 145,
    COMMA = 188,
    PERIOD = 190,
    SLASH = 191,
    BACK_QUOTE = 192,
    OPEN_BRACKET = 219,
    BACK_SLASH = 220,
    CLOSE_BRACKET = 221,
    QUOTE = 222,
    META = 224,
}

export enum MouseCodes {
    MOUSE_LEFT,
    MOUSE_RIGHT,
    MOUSE_MIDDLE,
}

export class Input {
    private static keysDown: any = {};
    private static keysUp: any = {};

    private static mouseDown: any = {};
    private static mouseUp: any = {};

    private static _mousePosition: Vector2 = new Vector2();
    private static horizontalAxis: number = 0;
    private static verticalAxis: number = 0;

    private static previousTouch: Vector2 = new Vector2();

    private static initialized = false;

    public static get mousePosition(): Vector2 {return Input._mousePosition; }

    public static Init() {
        if (this.initialized === true) return;

        if (!Renderer.canvas) throw Error("Renderer has no canvas.");

        document.onkeydown = (event) => { this.OnKeyDown(event) };
        document.onkeyup = (event) => { this.OnKeyUp(event) };
        document.onmousemove = (event) => { this.OnMouseMove(event) };
        document.onmousedown = (event) => { this.OnMouseDown(event) };
        document.onmouseup = (event) => { this.OnMouseUp(event) };
        document.ontouchmove = (event) => { this.OnTouchMove(event); };
        // document.ontouchstart = (event) => { this.OnTouchStart(event); };
        // document.ontouchend = (event) => { this.OnTouchEnd(event); };

        this.initialized = true;
    }

    private static OnTouchMove(event: TouchEvent) {
        event.preventDefault();
        this._mousePosition.x = event.touches[0].clientX;
        this._mousePosition.y = event.touches[0].clientY;
        this.horizontalAxis += Math.round(this._mousePosition.x - this.previousTouch.x);
        this.verticalAxis += Math.round(this._mousePosition.y - this.previousTouch.y);
        this.previousTouch.set(this._mousePosition.x, this._mousePosition.y);
    }

    private static OnMouseMove(event: MouseEvent) {
        this._mousePosition.x = event.clientX;
        this._mousePosition.y = event.clientY;
        this.horizontalAxis += event.movementX;
        this.verticalAxis += event.movementY;
    }

    private static OnKeyDown(event: KeyboardEvent) {
        if (this.keysDown[event.keyCode] === undefined) {
            this.keysDown[event.keyCode] = Renderer.info.frame;
            delete this.keysUp[event.keyCode];
        }
    }

    private static OnKeyUp(event: KeyboardEvent) {
        this.keysUp[event.keyCode] = Renderer.info.frame;
        delete this.keysDown[event.keyCode];
    }

    private static OnMouseDown(event: MouseEvent) {
        if (this.mouseDown[event.button] === undefined) {
            this.mouseDown[event.button] = Renderer.info.frame;
            delete this.keysUp[event.button];
        }
    }

    private static OnMouseUp(event: MouseEvent) {
        this.mouseUp[event.button] = Renderer.info.frame;
        delete this.mouseDown[event.button];
    }


    public static Update() {
        if (!this.initialized) return;
        this.horizontalAxis = 0;
        this.verticalAxis = 0;
    }

    /**
     * Checks if the specified key was pressed down during the current frame.
     * This method only returns true once per key down event, the key needs to be released 
     * and pressed again in order for the condition to be true once more.
     * 
     * @param {KeyCodes} key - Key to check for press event.
     * @returns {boolean} - True if the key was pressed down during this frame.
     */
    public static GetKeyDown(key: KeyCodes): boolean {
        this.Init();
        if (this.keysDown[key] == Renderer.info.frame - 1) {
            return true;
        }
        return false;
    }

    /**
     * Checks if the specified key was released during the current frame.
     * This method only returns true once per release event, the key needs to be pressed down 
     * and released again in order for the condition to be true once more.
     * 
     * @param {KeyCodes} key - Key to check for release event.
     * @returns {boolean} - True if the key was released during this frame.
     */
    public static GetKeyUp(key: KeyCodes): boolean {
        this.Init();
        if (this.keysUp[key] == Renderer.info.frame - 1) {
            return true;
        }
        return false;
    }

    /**
     * Checks if the specified key is pressed down.
     * This method returns true while the key is pressed down.
     * 
     * @param {KeyCodes} key - Key to check for press down event.
     * @returns {boolean} - True if the key is being pressed down.
     */
    public static GetKey(key: KeyCodes): boolean {
        this.Init();
        if (this.keysDown[key] !== undefined) {
            return true;
        }
        return false;
    }

    public static GetMouseDown(key: MouseCodes): boolean {
        this.Init();
        if (this.mouseDown[key] == Renderer.info.frame - 1) {
            return true;
        }
        return false;
    }

    public static GetMouseUp(key: MouseCodes): boolean {
        this.Init();
        if (this.mouseUp[key] == Renderer.info.frame - 1) {
            return true;
        }
        return false;
    }

    /**
     * Gets the mouse position difference between the previous frame and the current frame.
     * This method works with both the mouse and touch events.
     * 
     * @param {"Horizontal"|"Vertical"} axisName - Axis to query.
     * @returns {number} - Mouse difference between the previous frame and the current fram.
     */
    public static GetAxis(axisName: "Horizontal" | "Vertical"): number {
        this.Init();

        if (axisName == "Horizontal") {
            return this.horizontalAxis;
        }
        else if (axisName == "Vertical") {
            return this.verticalAxis;
        }
    }
}