import "./UIStats.css";

class Stat {
    protected statContainer: HTMLDivElement;
    constructor(container: HTMLDivElement) {
        this.statContainer = document.createElement("div");
        this.statContainer.classList.add("stat")
        container.appendChild(this.statContainer);
    }
}

export class UIGraph extends Stat {
    private label: HTMLSpanElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    private lastValue: number | null;

    constructor(folder: UIFolder, name: string, color = "white", lineWidth = 3) {
        super(folder.container);
        this.label = document.createElement("span");
        this.label.classList.add("title");
        this.label.style.alignItems = "normal";
        this.label.textContent = name;
        
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("value");
        this.statContainer.append(this.label, this.canvas);

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

        // window.scale = (sx, sy) => {
        //     this.ctx.scale(sx, sy);
        // }

        // window.translate = (x, y) => {
        //     this.ctx.translate(x, y);
        // }
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

export class UISliderStat extends Stat {
    constructor(folder: UIFolder, label: string, min: number, max: number, step: number, defaultValue: number, callback: (value: number) => void) {
        super(folder.container);
        const labelElement = document.createElement("label");
        labelElement.classList.add("title");
        labelElement.textContent = label;

        const sliderElement = document.createElement("input");
        sliderElement.classList.add("value", "slider");
        sliderElement.type = "range";
        sliderElement.min = `${min}`;
        sliderElement.max = `${max}`;
        sliderElement.step = `${step}`;
        sliderElement.value = `${defaultValue}`;
        sliderElement.addEventListener("input" , event => { callback(parseFloat(sliderElement.value)) });

        this.statContainer.append(labelElement, sliderElement);
    }
}

export class UITextStat extends Stat {
    private textElement: HTMLPreElement;
    private previousValue: number;
    private precision: number;
    private unit: string;
    private rolling: boolean;

    constructor(folder: UIFolder, label: string, defaultValue: number = 0, precision = 0, unit = "", rolling = false) {
        super(folder.container);
        const labelElement = document.createElement("label");
        labelElement.classList.add("title");
        labelElement.textContent = label;

        this.previousValue = defaultValue;
        this.precision = precision;
        this.unit = unit;
        this.rolling = rolling;

        this.textElement = document.createElement("pre");
        this.textElement.classList.add("value");
        this.textElement.textContent = defaultValue.toFixed(precision);

        this.statContainer.append(labelElement, this.textElement);
    }

    public SetValue(value: number) {
        if (this.rolling === true) {
            value = this.previousValue * 0.95 + value * 0.05;
        }
        const valueStr = this.precision === 0 ? value.toString() : value.toFixed(this.precision);
        this.textElement.textContent = valueStr + this.unit;
        this.previousValue = value;
    }
}

export class UIFolder extends Stat {
    private folderElement: HTMLDetailsElement;
    public readonly container: HTMLDivElement;

    constructor(container: HTMLDivElement | UIFolder, title: string) {
        super(container instanceof HTMLDivElement ? container : container.container);
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