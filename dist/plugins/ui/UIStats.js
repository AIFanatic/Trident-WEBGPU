import { GradientEditor } from './GradientEditor.js';
import styles from './resources/UIStats.css.js';
import { TextureViewer } from './TextureViewer.js';

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
  Disable() {
    this.statContainer.classList.add("disabled");
  }
  Enable() {
    this.statContainer.classList.remove("disabled");
  }
}
class UIGraph extends Stat {
  canvas;
  ctx;
  lastValue;
  constructor(folder, name, color = "white", lineWidth = 3) {
    super(folder.container, name);
    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("value");
    this.statContainer.append(this.canvas);
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
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width - 1, this.lastValue);
    this.ctx.lineTo(this.canvas.width, value);
    this.ctx.stroke();
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalCompositeOperation = "copy";
    this.ctx.drawImage(this.canvas, -1, 0);
    this.ctx.restore();
    this.lastValue = value;
  }
}
class UIDropdownStat extends Stat {
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
    this.selectElement.addEventListener("change", (event) => {
      onChanged(this.selectElement.selectedIndex, event.target.value);
    });
  }
}
class UIButtonStat extends Stat {
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
    this.button.addEventListener("click", (event) => {
      this.state = !this.state;
      if (this.state === true) this.button.textContent = this.offText;
      else this.button.textContent = this.onText;
      onClicked(this.state);
    });
  }
}
class UISliderStat extends Stat {
  constructor(folder, label, min, max, step, defaultValue, callback) {
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
    textElement.addEventListener("input", (event) => {
      sliderElement.value = textElement.value;
      callback(parseFloat(sliderElement.value));
    });
    textElement.addEventListener("change", (event) => {
      sliderElement.value = textElement.value;
      callback(parseFloat(sliderElement.value));
      if (textElement.value !== "") textElement.value = sliderElement.value;
    });
    sliderElement.addEventListener("input", (event) => {
      callback(parseFloat(sliderElement.value));
      textElement.value = sliderElement.value;
    });
    container.append(sliderElement, textElement);
    this.statContainer.append(container);
  }
}
class UITextStat extends Stat {
  textElement;
  rawValue;
  // Truth
  displayValue;
  // What we actually show on screen
  precision;
  unit;
  rolling;
  // Now formatter returns a string (for display only)
  formatter;
  constructor(folder, label, defaultValue = 0, precision = 0, unit = "", rolling = false) {
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
    setInterval(() => {
      this.Update();
    }, 100);
  }
  SetValue(value) {
    this.rawValue = value;
    if (!this.rolling) {
      this.displayValue = value;
    }
  }
  GetValue() {
    return this.rawValue;
  }
  GetPrecision() {
    return this.precision;
  }
  SetUnit(unit) {
    this.unit = unit;
  }
  // If you really want arbitrary text, it's better to have a separate method/class.
  // But here's a safe version that bypasses numeric logic:
  SetText(text) {
    this.textElement.textContent = text;
  }
  Update() {
    if (this.rolling) {
      const lerpFactor = 0.05;
      this.displayValue = this.displayValue * (1 - lerpFactor) + this.rawValue * lerpFactor;
    }
    const valueToShow = this.displayValue;
    const text = this.formatter ? this.formatter(valueToShow) : this.defaultFormat(valueToShow);
    this.textElement.textContent = text + this.unit;
  }
  defaultFormat(value) {
    return this.precision === 0 ? value.toString() : value.toFixed(this.precision);
  }
}
class UIColorStat extends Stat {
  colorElement;
  constructor(folder, label, color, onChanged) {
    super(folder.container, label);
    this.colorElement = document.createElement("input");
    this.colorElement.type = "color";
    this.colorElement.value = color;
    this.colorElement.classList.add("value", "color");
    this.statContainer.append(this.colorElement);
    this.colorElement.addEventListener("change", (event) => {
      onChanged(event.target.value);
    });
  }
}
class UIVecStat extends Stat {
  value;
  vecx;
  vecy;
  vecz;
  vecw;
  constructor(folder, label, x, y, z, w, onChanged) {
    super(folder.container, label);
    this.value = {
      x: x.value,
      y: y.value,
      z: z.value,
      w: w ? w.value : void 0
    };
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.maxWidth = "200px";
    this.vecx = this.CreateEntry("X", "#c0392b4a", x, (value) => {
      this.value.x = value;
      onChanged(this.value);
    });
    this.vecy = this.CreateEntry("Y", "#39c02b4a", y, (value) => {
      this.value.y = value;
      onChanged(this.value);
    });
    this.vecz = this.CreateEntry("Z", "#392bc04a", z, (value) => {
      this.value.z = value;
      onChanged(this.value);
    });
    container.append(this.vecx);
    container.append(this.vecy);
    container.append(this.vecz);
    if (w !== void 0) {
      this.vecw = this.CreateEntry("W", "#392bc04a", w, (value) => {
        this.value.w = value;
        onChanged(this.value);
      });
      container.append(this.vecw);
    }
    this.statContainer.append(container);
  }
  CreateEntry(label, color, entry, callback) {
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
    let mousePrevX = null;
    inputElement.addEventListener("change", (event) => {
      callback(parseFloat(inputElement.value));
    });
    inputElement.addEventListener("mousedown", (event) => {
      mouseDown = true;
    });
    document.body.addEventListener("mouseup", (event) => {
      mouseDown = false;
    });
    document.body.addEventListener("mousemove", (event) => {
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
      callback(parseFloat(inputElement.value));
    });
    return container;
  }
  SetValue(x, y, z, w) {
    if (x) this.vecx.querySelector("input").value = `${x}`;
    if (y) this.vecy.querySelector("input").value = `${y}`;
    if (z) this.vecz.querySelector("input").value = `${z}`;
    if (w) this.vecw.querySelector("input").value = `${w}`;
  }
}
class UIGradientStat extends Stat {
  container;
  onChanged = (gradient) => {
  };
  gradientEditor;
  constructor(folder, label, onChanged, defaultGradient) {
    super(folder.container, label);
    this.onChanged = onChanged;
    this.container = document.createElement("div");
    this.container.className = "value gradient-container";
    this.statContainer.append(this.container);
    const modal = Object.assign(document.createElement("div"), { style: "position: absolute; top: 0; visibility: hidden;" });
    const backdrop = Object.assign(document.createElement("div"), { style: "position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: none;" });
    this.gradientEditor = new GradientEditor(defaultGradient);
    modal.append(this.gradientEditor.container);
    document.body.append(backdrop);
    document.body.append(modal);
    window.addEventListener("pointerdown", (event) => {
      const target = event.target;
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
      } else {
        modal.style.visibility = "hidden";
        backdrop.style.display = "none";
      }
    });
    this.gradientEditor.onChanged = (gradient) => {
      this.onChanged(gradient);
      this.container.style.background = this.gradientEditor.currentGradient;
    };
  }
}
class UITextureViewer extends Stat {
  texture;
  textureViewer;
  constructor(folder, label, texture) {
    super(folder.container, label);
    this.texture = texture;
    this.textureViewer = new TextureViewer(texture);
    this.statContainer.append(this.textureViewer.canvasTexture.canvas);
    this.textureViewer.canvasTexture.canvas.style.height = "128px";
    this.textureViewer.canvasTexture.canvas.addEventListener("mouseover", (event) => {
      this.textureViewer.canvasTexture.canvas.style.height = "";
    });
    this.textureViewer.canvasTexture.canvas.addEventListener("mouseleave", (event) => {
      this.textureViewer.canvasTexture.canvas.style.height = "128px";
    });
    setTimeout(async () => {
      await this.textureViewer.init();
      await this.textureViewer.execute();
    }, 100);
  }
  async Update() {
    await this.textureViewer.execute();
  }
}
class UIFolder extends Stat {
  folderElement;
  container;
  constructor(container, title) {
    super(container instanceof HTMLDivElement ? container : container.container, null);
    if (!document.head.querySelector("#uistats-styles")) {
      const styleTag = document.createElement("style");
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
  SetPosition(position) {
    if (position.left) this.container.style.left = `${position.left}px`;
    if (position.right) this.container.style.right = `${position.right}px`;
    if (position.top) this.container.style.top = `${position.top}px`;
    if (position.bottom) this.container.style.bottom = `${position.bottom}px`;
  }
  Open() {
    this.folderElement.setAttribute("open", "");
  }
}

export { UIButtonStat, UIColorStat, UIDropdownStat, UIFolder, UIGradientStat, UIGraph, UISliderStat, UITextStat, UITextureViewer, UIVecStat };
