import "./UIStats.css";
class Stat {
    statContainer;
    constructor(container, label) {
        this.statContainer = document.createElement("div");
        this.statContainer.classList.add("stat");
        container.appendChild(this.statContainer);
        if (label !== null) {
            const labelElement = document.createElement("label");
            labelElement.classList.add("title");
            labelElement.classList.add("title");
            labelElement.textContent = label;
            this.statContainer.append(labelElement);
        }
    }
    Disable() { this.statContainer.classList.add("disabled"); }
    Enable() { this.statContainer.classList.remove("disabled"); }
}
export class UIGraph extends Stat {
    canvas;
    ctx;
    lastValue;
    constructor(folder, name, color = "white", lineWidth = 3) {
        super(folder.container, name);
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("value");
        this.statContainer.append(this.canvas);
        // this.canvas.style.width = "100%";
        // this.canvas.style.height = "100%";
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight * 0.25;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.scale(1, -1);
        this.ctx.translate(0, -this.canvas.height);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.lastValue = null;
    }
    addValue(value) {
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
    selectElement;
    constructor(folder, label, options, onChanged, defaultIndex = 0) {
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
            onChanged(this.selectElement.selectedIndex, event.target.value);
        });
    }
}
export class UIButtonStat extends Stat {
    button;
    state;
    onText;
    offText;
    constructor(folder, label, onClicked, defaultState = false, onText = "Enable", offText = "Disable") {
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
            if (this.state === true)
                this.button.textContent = this.offText;
            else
                this.button.textContent = this.onText;
            onClicked(this.state);
        });
    }
}
export class UISliderStat extends Stat {
    constructor(folder, label, min, max, step, defaultValue, callback) {
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
            // if (textElement.value !== "") textElement.value = sliderElement.value;
        });
        textElement.addEventListener("change", event => {
            sliderElement.value = textElement.value;
            callback(parseFloat(sliderElement.value));
            if (textElement.value !== "")
                textElement.value = sliderElement.value;
        });
        sliderElement.addEventListener("input", event => {
            callback(parseFloat(sliderElement.value));
            textElement.value = sliderElement.value;
        });
        container.append(sliderElement, textElement);
        this.statContainer.append(container);
    }
}
export class UITextStat extends Stat {
    textElement;
    previousValue;
    precision;
    unit;
    rolling;
    constructor(folder, label, defaultValue = 0, precision = 0, unit = "", rolling = false) {
        super(folder.container, label);
        this.previousValue = defaultValue;
        this.precision = precision;
        this.unit = unit;
        this.rolling = rolling;
        this.textElement = document.createElement("pre");
        this.textElement.classList.add("value");
        this.textElement.textContent = defaultValue.toFixed(precision);
        this.statContainer.append(this.textElement);
        // Update the values like this so it doesnt hang the rendering pipeline
        setInterval(() => {
            this.Update();
        }, 100);
    }
    SetValue(value) {
        if (this.rolling === true) {
            value = this.previousValue * 0.95 + value * 0.05;
        }
        // const valueStr = this.precision === 0 ? value.toString() : value.toFixed(this.precision);
        // this.textElement.textContent = valueStr + this.unit;
        this.previousValue = value;
    }
    GetValue() { return this.previousValue; } // TODO: Current value
    GetPrecision() { return this.precision; }
    SetUnit(unit) { this.unit = unit; }
    ;
    Update() {
        const valueStr = this.precision === 0 ? this.previousValue.toString() : this.previousValue.toFixed(this.precision);
        this.textElement.textContent = valueStr + this.unit;
    }
}
export class UIColorStat extends Stat {
    colorElement;
    constructor(folder, label, color, onChanged) {
        super(folder.container, label);
        this.colorElement = document.createElement("input");
        this.colorElement.type = "color";
        this.colorElement.value = color;
        this.colorElement.classList.add("value", "color");
        this.statContainer.append(this.colorElement);
        this.colorElement.addEventListener("change", event => {
            onChanged(event.target.value);
        });
    }
}
;
export class UIVecStat extends Stat {
    value;
    constructor(folder, label, value, onChanged) {
        super(folder.container, label);
        this.value = { x: value.x, y: value.y, z: value.z };
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.width = "110px";
        const vecx = this.CreateEntry("X", "#c0392b4a", value => { this.value.x = value; onChanged(this.value); });
        const vecy = this.CreateEntry("Y", "#39c02b4a", value => { this.value.y = value; onChanged(this.value); });
        const vecz = this.CreateEntry("Z", "#392bc04a", value => { this.value.z = value; onChanged(this.value); });
        container.append(vecx);
        container.append(vecy);
        container.append(vecz);
        this.statContainer.append(container);
    }
    CreateEntry(label, color, callback) {
        const container = document.createElement("div");
        container.classList.add("vec-container");
        const text = document.createElement("span");
        text.classList.add("vec-label");
        text.style.backgroundColor = color;
        text.textContent = label;
        container.append(text);
        const inputElement = document.createElement("input");
        inputElement.classList.add("vec-input");
        inputElement.value = "10";
        container.append(inputElement);
        let mouseDown = false;
        let mousePrevX = null;
        inputElement.addEventListener("change", event => { callback(parseFloat(inputElement.value)); });
        inputElement.addEventListener("mousedown", event => { mouseDown = true; });
        document.body.addEventListener("mouseup", event => { mouseDown = false; });
        document.body.addEventListener("mousemove", event => {
            if (!mouseDown)
                return;
            const mouseX = event.clientX;
            if (mousePrevX === null) {
                mousePrevX = mouseX;
                return;
            }
            const delta = mouseX - mousePrevX;
            inputElement.value = `${parseFloat(inputElement.value) + delta}`;
            mousePrevX = mouseX;
            callback(parseFloat(inputElement.value));
        });
        return container;
    }
}
export class UIFolder extends Stat {
    folderElement;
    container;
    constructor(container, title) {
        super(container instanceof HTMLDivElement ? container : container.container, null);
        this.folderElement = document.createElement("details");
        const folderTitle = document.createElement("summary");
        folderTitle.textContent = title;
        this.container = document.createElement("div");
        this.folderElement.append(folderTitle, this.container);
        this.statContainer.append(this.folderElement);
    }
    SetPosition(position) {
        if (position.left)
            this.container.style.left = `${position.left}px`;
        if (position.right)
            this.container.style.right = `${position.right}px`;
        if (position.top)
            this.container.style.top = `${position.top}px`;
        if (position.bottom)
            this.container.style.bottom = `${position.bottom}px`;
    }
    Open() {
        this.folderElement.setAttribute("open", "");
    }
}
