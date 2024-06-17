class UISliderStat {
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

        document.body.appendChild(this.container);
    }

    public AddSlider(label: string, min: number, max: number, step: number, defaultValue: number, callback: (value: number) => void) {
        this.stats.push(new UISliderStat(this.container, label, min, max, step, defaultValue, callback));
    }
}