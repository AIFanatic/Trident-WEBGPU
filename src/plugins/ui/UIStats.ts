import "./UIStats.css";

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
        sliderElement.style.width = "60px";
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
    private previousValue: number;
    private precision: number;
    private unit: string;
    private rolling: boolean;

    constructor(folder: UIFolder, label: string, defaultValue: number = 0, precision = 0, unit = "", rolling = false) {
        super(folder.container, label);

        this.previousValue = defaultValue;
        this.precision = precision;
        this.unit = unit;
        this.rolling = rolling;

        this.textElement = document.createElement("pre");
        this.textElement.classList.add("value");
        this.textElement.textContent = defaultValue.toFixed(precision);

        this.statContainer.append(this.textElement);
    }

    public SetValue(value: number) {
        if (this.rolling === true) {
            value = this.previousValue * 0.95 + value * 0.05;
        }
        const valueStr = this.precision === 0 ? value.toString() : value.toFixed(this.precision);
        this.textElement.textContent = valueStr + this.unit;
        this.previousValue = value;
    }

    public GetValue(): number { return this.previousValue; } // TODO: Current value
    public GetPrecision(): number { return this.precision; }

    public SetUnit(unit: string) { this.unit = unit };
}

export class UIFolder extends Stat {
    private folderElement: HTMLDetailsElement;
    public readonly container: HTMLDivElement;

    constructor(container: HTMLDivElement | UIFolder, title: string) {
        super(container instanceof HTMLDivElement ? container : container.container, null);
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