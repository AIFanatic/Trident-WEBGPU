import { GPU } from "@trident/core";
import { ColorPicker } from "./ColorPicker";
import { Gradient, GradientEditor } from "./GradientEditor";
import styles from "./resources/UIStats.css";
import { TextureViewer } from "./TextureViewer";

class Stat {
    protected statContainer: HTMLDivElement;

    constructor(container: HTMLDivElement, label: string | null) {
        this.statContainer = document.createElement("div");
        this.statContainer.classList.add("stat")
        container.appendChild(this.statContainer);

        if (label !== null) {
            const labelElement = document.createElement("label");
            labelElement.classList.add("title");
            labelElement.classList.add("title");
            labelElement.textContent = label;
            this.statContainer.append(labelElement);
        }

    }

    public Disable() { this.statContainer.classList.add("disabled"); }
    public Enable() { this.statContainer.classList.remove("disabled"); }
}

export class UIGraph extends Stat {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    private lastValue: number | null;

    constructor(folder: UIFolder, name: string, color = "white", lineWidth = 3) {
        super(folder.container, name);

        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("value");
        this.statContainer.append(this.canvas);

        // this.canvas.style.width = "100%";
        // this.canvas.style.height = "100%";
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight * 0.25;
        
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
        this.ctx.scale(1, -1);
        this.ctx.translate(0, -this.canvas.height);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;

        this.lastValue = null;
    }

    public addValue(value: number) {
        if (this.lastValue === null) {
            this.lastValue = value;
            return;
        }
    
        // Draw the new line segment
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 1, this.lastValue);
        this.ctx.lineTo(this.canvas.width, value);
        this.ctx.stroke();

        
        // Shift the canvas content to the left
        this.ctx.save(); // Save the current context state
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transformation matrix
        this.ctx.globalCompositeOperation = "copy";
        this.ctx.drawImage(this.canvas, -1, 0);
        this.ctx.restore();


        // Update the last value
        this.lastValue = value;
    }
}

export class UIDropdownStat extends Stat {
    private selectElement: HTMLSelectElement;

    constructor(folder: UIFolder, label: string, options: string[], onChanged: (index: number, value: string) => void, defaultIndex: number = 0) {
        super(folder.container, label);
        this.selectElement = document.createElement("select");
        this.selectElement.classList.add("value");
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            this.selectElement.append(optionElement);

            if (i === defaultIndex) {
                this.selectElement.value = option;
            }
        }
        this.statContainer.append(this.selectElement);

        this.selectElement.addEventListener("change", event => {
            onChanged(this.selectElement.selectedIndex, (event.target as HTMLOptionElement).value);
        })
    }
}

export class UIButtonStat extends Stat {
    private button: HTMLButtonElement;
    private state: boolean;
    private onText: string;
    private offText: string;

    constructor(folder: UIFolder, label: string, onClicked: (state: boolean) => void, defaultState: boolean = false, onText: string = "Enable", offText: string = "Disable") {
        super(folder.container, label);
        this.state = defaultState;
        this.onText = onText;
        this.offText = offText;

        this.button = document.createElement("button");
        this.button.classList.add("value");
        this.button.textContent = defaultState === true ? offText : onText;
        this.statContainer.append(this.button);

        this.button.addEventListener("click", event => {
            this.state = !this.state;
            if (this.state === true) this.button.textContent = this.offText;
            else this.button.textContent = this.onText;
            onClicked(this.state);
        })
    }
}

export class UISliderStat extends Stat {
    constructor(folder: UIFolder, label: string, min: number, max: number, step: number, defaultValue: number, callback: (value: number) => void) {
        super(folder.container, label);

        const container = document.createElement("div");
        container.classList.add("value");
        container.style.display = "inline-flex";
        container.style.alignItems = "center";
        container.style.padding = "0px";

        const sliderElement = document.createElement("input");
        sliderElement.classList.add("slider");
        sliderElement.style.width = "76px";
        sliderElement.style.margin = "0px";
        sliderElement.type = "range";
        sliderElement.min = `${min}`;
        sliderElement.max = `${max}`;
        sliderElement.step = `${step}`;
        sliderElement.value = `${defaultValue}`;

        const textElement = document.createElement("input");
        textElement.style.width = "25px";
        textElement.style.marginLeft = "5px";
        textElement.value = defaultValue.toString();
        textElement.addEventListener("input", event => {
            sliderElement.value = textElement.value;
            callback(parseFloat(sliderElement.value));
            // if (textElement.value !== "") textElement.value = sliderElement.value;
        })
        textElement.addEventListener("change", event => {
            sliderElement.value = textElement.value;
            callback(parseFloat(sliderElement.value));
            if (textElement.value !== "") textElement.value = sliderElement.value;
        })

        sliderElement.addEventListener("input" , event => {
            callback(parseFloat(sliderElement.value));
            textElement.value = sliderElement.value;
        });

        container.append(sliderElement, textElement);
        this.statContainer.append(container);
    }
}

export class UITextStat extends Stat {
    private textElement: HTMLPreElement;

    private rawValue: number;        // Truth
    private displayValue: number;    // What we actually show on screen

    private precision: number;
    private unit: string;
    private rolling: boolean;

    // Now formatter returns a string (for display only)
    public formatter?: (value: number) => string;

    constructor(
        folder: UIFolder,
        label: string,
        defaultValue: number = 0,
        precision = 0,
        unit = "",
        rolling = false
    ) {
        super(folder.container, label);

        this.rawValue = defaultValue;
        this.displayValue = defaultValue;

        this.precision = precision;
        this.unit = unit;
        this.rolling = rolling;

        this.textElement = document.createElement("pre");
        this.textElement.classList.add("value");
        this.textElement.textContent = this.defaultFormat(defaultValue);

        this.statContainer.append(this.textElement);

        // Still doing interval-based updates, but now they don't mutate the source value
        setInterval(() => {
            this.Update();
        }, 100);
    }

    public SetValue(value: number) {
        this.rawValue = value;

        // If not rolling, just snap display to the raw value immediately
        if (!this.rolling) {
            this.displayValue = value;
        }
    }

    public GetValue(): number {
        return this.rawValue;
    }

    public GetPrecision(): number {
        return this.precision;
    }

    public SetUnit(unit: string) {
        this.unit = unit;
    }

    // If you really want arbitrary text, it's better to have a separate method/class.
    // But here's a safe version that bypasses numeric logic:
    public SetText(text: string) {
        this.textElement.textContent = text;
    }

    public Update() {
        // Update smoothing first (if enabled)
        if (this.rolling) {
            const lerpFactor = 0.05; // same as your original
            this.displayValue = this.displayValue * (1 - lerpFactor) + this.rawValue * lerpFactor;
        }

        const valueToShow = this.displayValue;

        const text = this.formatter
            ? this.formatter(valueToShow)
            : this.defaultFormat(valueToShow);

        this.textElement.textContent = text + this.unit;
    }

    private defaultFormat(value: number): string {
        return this.precision === 0 ? value.toString() : value.toFixed(this.precision);
    }
}

export class UIColorStat extends Stat {
    private colorElement: HTMLInputElement;

    constructor(folder: UIFolder, label: string, color: string, onChanged: (color: string) => void) {
        super(folder.container, label);
        this.colorElement = document.createElement("input");
        this.colorElement.type = "color";
        this.colorElement.value = color;
        this.colorElement.classList.add("value", "color");
        this.statContainer.append(this.colorElement);

        this.colorElement.addEventListener("change", event => {
            onChanged((event.target as HTMLOptionElement).value);
        })
    }
}

type Vec3 = {x: number, y: number, z: number};
type Vec4 = {x: number, y: number, z: number, w: number};

interface VecEntry {
    value: number;
    min: number;
    max: number;
    step: number;
}

export class UIVecStat extends Stat {
    private value: Vec4;
    private vecx: HTMLDivElement;
    private vecy: HTMLDivElement;
    private vecz: HTMLDivElement;
    private vecw: HTMLDivElement;
    constructor(folder: UIFolder, label: string, x: VecEntry, y: VecEntry, z: VecEntry, w: VecEntry | undefined, onChanged: (value: Vec4) => void) {
        super(folder.container, label);

        this.value = {
            x: x.value,
            y: y.value,
            z: z.value,
            w: w ? w.value : undefined,
        };

        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.maxWidth = "200px";
        this.vecx = this.CreateEntry("X", "#c0392b4a", x, value => {this.value.x = value; onChanged(this.value)});
        this.vecy = this.CreateEntry("Y", "#39c02b4a", y, value => {this.value.y = value; onChanged(this.value)});
        this.vecz = this.CreateEntry("Z", "#392bc04a", z, value => {this.value.z = value; onChanged(this.value)});

        container.append(this.vecx);
        container.append(this.vecy);
        container.append(this.vecz);

        if (w !== undefined) {
            this.vecw = this.CreateEntry("W", "#392bc04a", w, value => {this.value.w = value; onChanged(this.value)});
            container.append(this.vecw);
        }

        this.statContainer.append(container);
    }

    private CreateEntry(label: string, color: string, entry: VecEntry, callback: (value: number) => void): HTMLDivElement {
        const container = document.createElement("div");
        container.classList.add("vec-container");

        const text = document.createElement("span");
        text.classList.add("vec-label");
        text.style.backgroundColor = color;
        text.textContent = label;
        container.append(text);
        const inputElement = document.createElement("input");
        inputElement.classList.add("vec-input");
        inputElement.value = entry.value.toString();
        inputElement.min = entry.min.toString();
        inputElement.max = entry.max.toString();
        inputElement.step = entry.step.toString();
        container.append(inputElement);

        let mouseDown = false;
        let mousePrevX: number | null = null;

        inputElement.addEventListener("change", event => { callback(parseFloat(inputElement.value)) });
        inputElement.addEventListener("mousedown", event => { mouseDown = true; });
        document.body.addEventListener("mouseup", event => { mouseDown = false; });

        document.body.addEventListener("mousemove", event => {
            if (!mouseDown) return;

            const mouseX = event.clientX;
            if (mousePrevX === null) {
                mousePrevX = mouseX;
                return;
            }

            const delta = (mouseX - mousePrevX) * parseFloat(inputElement.step);
            const newValue = parseFloat(inputElement.value) + delta;
            if (newValue < parseFloat(inputElement.min)) return;
            else if (newValue > parseFloat(inputElement.max)) return;

            inputElement.value = newValue.toPrecision(2);

            mousePrevX = mouseX;

            callback(parseFloat(inputElement.value))
        });

        return container;
    }

    public SetValue(x?: number, y?: number, z?: number, w?: number) {
        if (x) this.vecx.querySelector("input").value = `${x}`;
        if (y) this.vecy.querySelector("input").value = `${y}`;
        if (z) this.vecz.querySelector("input").value = `${z}`;
        if (w) this.vecw.querySelector("input").value = `${w}`;
    }
}

export class UIGradientStat extends Stat {
    private container: HTMLElement;
    private onChanged = (gradient: Gradient) => {};

    private gradientEditor: GradientEditor;

    constructor(folder: UIFolder, label: string, onChanged: (gradient: Gradient) => void, defaultGradient?: Gradient) {
        super(folder.container, label);

        this.onChanged = onChanged;
        this.container = document.createElement("div");
        this.container.className = "value gradient-container";

        this.statContainer.append(this.container);

        const modal = Object.assign(document.createElement("div"), {style: "position: absolute; top: 0; visibility: hidden;"});
        const backdrop = Object.assign(document.createElement("div"), {style: "position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: none;"});
        this.gradientEditor = new GradientEditor(defaultGradient);
        modal.append(this.gradientEditor.container);
        document.body.append(backdrop);
        document.body.append(modal);

        window.addEventListener("pointerdown", event => {
            const target = event.target as HTMLElement;
            if (modal.contains(target)) return;
            if (target.contains(this.container)) {
                modal.style.visibility = "";
                backdrop.style.display = "";
                const rect = modal.getBoundingClientRect();
                let x = event.clientX;
                let y = event.clientY;
                if (x + rect.width > window.innerWidth) y -= rect.width;
                if (y + rect.height > window.innerHeight) y -= rect.height;
                modal.style.left = `${x}px`;
                modal.style.top = `${y}px`;
            }
            else {
                modal.style.visibility = "hidden";
                backdrop.style.display = "none";
            }
        })

        this.gradientEditor.onChanged = gradient => {
            this.onChanged(gradient);
            this.container.style.background = this.gradientEditor.currentGradient;
        }
    }
}

export class UITextureViewer extends Stat {
    private texture: GPU.Texture;
    private textureViewer: TextureViewer;

    constructor(folder: UIFolder, label: string, texture: GPU.Texture) {
        super(folder.container, label);
        this.texture = texture;

        this.textureViewer = new TextureViewer(texture);
        this.statContainer.append(this.textureViewer.canvasTexture.canvas);
        this.textureViewer.canvasTexture.canvas.style.width = "256px";

        // Some time for setup
        setTimeout(async () => {
            await this.textureViewer.init();
            await this.textureViewer.execute();
        }, 100);
    }

    public async Update() {
        await this.textureViewer.execute();
    }
}

export class UIFolder extends Stat {
    private folderElement: HTMLDetailsElement;
    public readonly container: HTMLDivElement;

    constructor(container: HTMLDivElement | UIFolder, title: string) {
        super(container instanceof HTMLDivElement ? container : container.container, null);
        // Inject styles
        if (!document.head.querySelector("#uistats-styles")) {
            const styleTag = document.createElement('style');
            styleTag.id = "uistats-styles";
            styleTag.textContent = styles;
            document.head.appendChild(styleTag);
        }

        this.folderElement = document.createElement("details");
        const folderTitle = document.createElement("summary");
        folderTitle.textContent = title;
        this.container = document.createElement("div");
        this.folderElement.append(folderTitle, this.container);
        this.statContainer.append(this.folderElement);
    }

    public SetPosition(position: {left?: number, right?: number, top?: number, bottom?: number}) {
        if (position.left) this.container.style.left = `${position.left}px`;
        if (position.right) this.container.style.right = `${position.right}px`;
        if (position.top) this.container.style.top = `${position.top}px`;
        if (position.bottom) this.container.style.bottom = `${position.bottom}px`;
    }

    public Open() {
        this.folderElement.setAttribute("open", "");
    }
}