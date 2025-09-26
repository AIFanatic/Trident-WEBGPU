import styles from './resources/ColorPicker.css.js';

class ColorPicker {
  HSL = [
    { pos: 0, color: this.hexToRgb("#ff0000") },
    // red
    { pos: 17, color: this.hexToRgb("#ffff00") },
    // yellow
    { pos: 33, color: this.hexToRgb("#00ff00") },
    // green
    { pos: 50, color: this.hexToRgb("#00ffff") },
    // cyan
    { pos: 67, color: this.hexToRgb("#0000ff") },
    // blue
    { pos: 83, color: this.hexToRgb("#ff00ff") },
    // magenta
    { pos: 100, color: this.hexToRgb("#ff0000") }
    // red
  ];
  container;
  colorCanvas;
  colorCanvasPicker;
  color;
  hue;
  alpha;
  colorInput;
  colorInputR;
  colorInputG;
  colorInputB;
  colorInputA;
  onColorChanged = (color, alpha) => {
  };
  constructor(r = 0, g = 0, b = 0, a = 255) {
    if (!document.head.querySelector("#colorpicker-styles")) {
      const styleTag = document.createElement("style");
      styleTag.id = "colorpicker-styles";
      styleTag.textContent = styles;
      document.head.appendChild(styleTag);
    }
    this.container = Object.assign(document.createElement("div"), { className: "color-picker" });
    this.colorCanvas = Object.assign(document.createElement("div"), { className: "color-canvas" });
    this.colorCanvasPicker = Object.assign(document.createElement("div"), { className: "color-canvas-picker", style: `pointer-events: none;` });
    this.color = Object.assign(document.createElement("div"), { className: "color" });
    const rangeContainer = Object.assign(document.createElement("div"), { className: "range-container" });
    this.hue = Object.assign(document.createElement("input"), { className: "range hue", type: "range", min: 0, max: 360, step: 0.1 });
    this.alpha = Object.assign(document.createElement("input"), { className: "range alpha", type: "range", min: 0, max: 1, step: 0.01, value: a / 255 });
    this.colorInput = Object.assign(document.createElement("div"), { className: "color-input" });
    this.colorInputR = Object.assign(document.createElement("input"), { type: "number", min: 0, max: 1, step: 0.01, value: r / 255 });
    this.colorInputG = Object.assign(document.createElement("input"), { type: "number", min: 0, max: 1, step: 0.01, value: g / 255 });
    this.colorInputB = Object.assign(document.createElement("input"), { type: "number", min: 0, max: 1, step: 0.01, value: b / 255 });
    this.colorInputA = Object.assign(document.createElement("input"), { type: "number", min: 0, max: 1, step: 0.01, value: a / 255 });
    this.colorInput.append(this.colorInputR, this.colorInputG, this.colorInputB, this.colorInputA);
    const colorInputLabel = Object.assign(document.createElement("div"), { className: "color-input" });
    const colorInputRLabel = Object.assign(document.createElement("span"), { textContent: "R" });
    const colorInputGLabel = Object.assign(document.createElement("span"), { textContent: "G" });
    const colorInputBLabel = Object.assign(document.createElement("span"), { textContent: "B" });
    const colorInputALabel = Object.assign(document.createElement("span"), { textContent: "A" });
    colorInputLabel.append(colorInputRLabel, colorInputGLabel, colorInputBLabel, colorInputALabel);
    rangeContainer.append(this.hue, this.alpha);
    this.container.append(this.colorCanvas, this.colorCanvasPicker, this.color, rangeContainer, colorInputLabel, this.colorInput);
    this.hue.addEventListener("input", (event) => {
      this.update();
    });
    this.alpha.addEventListener("input", (event) => {
      this.update();
    });
    let isMouseDown = false;
    window.addEventListener("pointerdown", (event) => {
      isMouseDown = event.target === this.colorCanvas;
      this.updatePicker(isMouseDown, event.clientX, event.clientY);
    });
    window.addEventListener("pointerup", (event) => {
      isMouseDown = false;
    });
    window.addEventListener("pointermove", (event) => {
      this.updatePicker(isMouseDown, event.clientX, event.clientY);
    });
    this.colorInputR.addEventListener("change", (event) => {
      this.colorChanged();
    });
    this.colorInputG.addEventListener("change", (event) => {
      this.colorChanged();
    });
    this.colorInputB.addEventListener("change", (event) => {
      this.colorChanged();
    });
    this.colorInputA.addEventListener("change", (event) => {
      this.colorChanged();
    });
    setTimeout(() => {
      this.colorChanged();
    }, 10);
  }
  colorChanged() {
    const hsv = this.rgbToHsv(parseFloat(this.colorInputR.value) * 255, parseFloat(this.colorInputG.value) * 255, parseFloat(this.colorInputB.value) * 255);
    this.hue.value = hsv.h.toString();
    const rect = this.colorCanvas.getBoundingClientRect();
    this.colorCanvasPicker.style.left = `${hsv.s * rect.width}px`;
    this.colorCanvasPicker.style.top = `${(1 - hsv.v) * rect.height}px`;
    this.alpha.value = this.colorInputA.value;
    this.update();
  }
  updatePicker(mouseDown, x, y) {
    if (mouseDown === false) return;
    const rect = this.colorCanvas.getBoundingClientRect();
    this.colorCanvasPicker.style.left = `${Math.max(0, Math.min(rect.width, x - rect.left))}px`;
    this.colorCanvasPicker.style.top = `${Math.max(0, Math.min(rect.height, y - rect.top))}px`;
    this.update();
  }
  update() {
    const format = (value) => (value / 255).toFixed(2);
    const gradient = this.sampleGradient(this.HSL, parseFloat(this.hue.value) / 360 * 100);
    this.colorCanvas.getBoundingClientRect();
    const x = parseFloat(this.colorCanvasPicker.style.left) / this.colorCanvas.clientWidth;
    const y = parseFloat(this.colorCanvasPicker.style.top) / this.colorCanvas.clientHeight;
    const color = this.hsvToRgb(parseFloat(this.hue.value), x, 1 - y);
    this.colorCanvas.style.background = `linear-gradient(transparent 0%, rgb(0, 0, 0) 100%), linear-gradient(to left, transparent 0%, rgb(255, 255, 255) 100%), rgb(${gradient.r}, ${gradient.g}, ${gradient.b})`;
    this.alpha.style.background = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".05"><rect x="8" width="8" height="8"/><rect y="8" width="8" height="8"/></svg>'), linear-gradient(to right, rgba(255, 255, 255, 1), rgb(${color.r}, ${color.g}, ${color.b}))`;
    this.colorInputR.value = format(color.r);
    this.colorInputG.value = format(color.g);
    this.colorInputB.value = format(color.b);
    this.colorInputA.value = format(parseFloat(this.alpha.value) * 255);
    this.color.style.background = `rgba(${color.r}, ${color.g}, ${color.b}, ${this.alpha.value})`;
    this.onColorChanged(color, Math.floor(parseFloat(this.colorInputA.value) * 255));
  }
  hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
    const int = parseInt(hex, 16);
    return { r: int >> 16 & 255, g: int >> 8 & 255, b: int & 255 };
  }
  rgbToHex({ r, g, b }) {
    const toHex = (c) => c.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  hsvToRgb(h, s, v) {
    let c = v * s;
    let x = c * (1 - Math.abs(h / 60 % 2 - 1));
    let m = v - c;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }
  rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let d = max - min, h, s, v = max;
    s = max === 0 ? 0 : d / max;
    if (d === 0) h = 0;
    else if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s, v };
  }
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
  sampleGradient(stops, percent) {
    percent = Math.max(0, Math.min(100, percent));
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (percent >= a.pos && percent <= b.pos) {
        const t = (percent - a.pos) / (b.pos - a.pos);
        return { r: Math.round(this.lerp(a.color.r, b.color.r, t)), g: Math.round(this.lerp(a.color.g, b.color.g, t)), b: Math.round(this.lerp(a.color.b, b.color.b, t)) };
      }
    }
    return stops[stops.length - 1].color;
  }
  setPosition(x, y) {
    Object.assign(this.container.style, { left: `${x}px`, top: `${y}px` });
  }
  setColorRGB(r, g, b, a) {
    this.colorInputR.value = `${r / 255}`, this.colorInputG.value = `${g / 255}`, this.colorInputB.value = `${b / 255}`, this.colorInputA.value = `${a / 255}`, this.colorChanged();
  }
  setColorHEX(hex) {
    const c = this.hexToRgb(hex);
    this.setColorRGB(c.r, c.g, c.b, 255);
  }
  disableColor() {
    [this.colorInputR, this.colorInputG, this.colorInputB, this.colorCanvas, this.hue].forEach((element) => element.classList.add("disabled"));
  }
  enableColor() {
    [this.colorInputR, this.colorInputG, this.colorInputB, this.colorCanvas, this.hue].forEach((element) => element.classList.remove("disabled"));
  }
  disableAlpha() {
    [this.colorInputA, this.alpha].forEach((element) => element.classList.add("disabled"));
  }
  enableAlpha() {
    [this.colorInputA, this.alpha].forEach((element) => element.classList.remove("disabled"));
  }
}

export { ColorPicker };
