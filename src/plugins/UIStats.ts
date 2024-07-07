class Stat {
    protected statContainer: HTMLDivElement;
    constructor(container: HTMLDivElement) {
        this.statContainer = document.createElement("div");
        container.appendChild(this.statContainer);
    }
}

export class UISliderStat {
    constructor(container: HTMLDivElement, label: string, min: number, max: number, step: number, defaultValue: number, callback: (value: number) => void) {

        const labelElement = document.createElement("label");
        labelElement.textContent = label;

        const sliderElement = document.createElement("input");
        sliderElement.type = "range";
        sliderElement.min = `${min}`;
        sliderElement.max = `${max}`;
        sliderElement.step = `${step}`;
        sliderElement.value = `${defaultValue}`;
        sliderElement.addEventListener("input" , event => { callback(parseFloat(sliderElement.value)) });

        container.append(labelElement, sliderElement);
    }
}

export class UITextStat extends Stat {
    private textElement: HTMLPreElement;
    constructor(container: HTMLDivElement, label: string, defaultValue: string) {
        super(container);
        const labelElement = document.createElement("label");
        labelElement.textContent = label;

        this.textElement = document.createElement("pre");
        this.textElement.textContent = defaultValue;

        this.statContainer.append(labelElement, this.textElement);
    }

    public SetValue(value: string) {
        this.textElement.textContent = value;
    }
}

export class UIStats {
    private container: HTMLDivElement;
    private stats: UISliderStat[] = [];

    constructor() {
        this.container = document.createElement("div");
        this.container.style.position = "absolute";
        this.container.style.top = "0px";
        this.container.style.color = "white";
        this.container.style.display = "grid";
        this.container.style.backgroundColor = "#222222";
        this.container.style.fontSize = "10px";
        this.container.style.minWidth = "200px";

        document.body.appendChild(this.container);
    }

    public SetPosition(position: {left?: number, right?: number, top?: number, bottom?: number}) {
        if (position.left) this.container.style.left = `${position.left}px`;
        if (position.right) this.container.style.right = `${position.right}px`;
        if (position.top) this.container.style.top = `${position.top}px`;
        if (position.bottom) this.container.style.bottom = `${position.bottom}px`;
    }

    public AddSlider(label: string, min: number, max: number, step: number, defaultValue: number, callback: (value: number) => void): UISliderStat {
        const stat = new UISliderStat(this.container, label, min, max, step, defaultValue, callback);
        this.stats.push(stat);
        return stat;
    }

    public AddTextStat(label: string, defaultValue: string): UITextStat {
        const stat = new UITextStat(this.container, label, defaultValue);
        this.stats.push(stat);
        return stat;
    }
}