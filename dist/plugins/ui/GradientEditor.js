import { ColorPicker } from './ColorPicker.js';
import styles from './resources/GradientEditor.css.js';

class GradientEditor {
  container;
  colorPicker;
  pickersList;
  alphasContainer;
  gradient;
  colorsContainer;
  settingsInputLocation;
  settingsButtonDelete;
  mouse;
  selectedPicker;
  onChanged = (gradient) => {
  };
  currentGradient = "";
  constructor(defaultGradient) {
    if (!document.head.querySelector("#gradient-editor-styles")) {
      const styleTag = document.createElement("style");
      styleTag.id = "gradient-editor-styles";
      styleTag.textContent = styles;
      document.head.appendChild(styleTag);
    }
    this.container = Object.assign(document.createElement("div"), { className: "color-gradient", style: "display: block; max-width: 200px;" });
    this.colorPicker = new ColorPicker();
    this.pickersList = [];
    this.alphasContainer = Object.assign(document.createElement("div"), { className: "alphas", style: "width: 100%; height: 10px; background: #ffffff80; border: 1px solid white; border-radius: 3px;" });
    this.gradient = Object.assign(document.createElement("div"), { className: "gradient", style: "width: 100%; height: 40px; background: black; border: 1px solid white; border-radius: 3px; margin-top: 5px; margin-bottom: 5px" });
    this.colorsContainer = Object.assign(document.createElement("div"), { className: "colors", style: "width: 100%; height: 10px; border: 1px solid white; margin-bottom: 5px; border-radius: 3px" });
    const settingsContainer = Object.assign(document.createElement("div"), { className: "settings", style: "background: gray; border-radius: 3px; margin-top: 5px; margin-bottom: 5px; font-size: 10px; font-family: monospace; color: white; padding: 5px; pos" });
    const settingsLabelContainer = Object.assign(document.createElement("div"), { className: "settings-label-container", style: "display: flex; position: relative; font-size: 5px; gap: 5px" });
    const settingsInputContainer = Object.assign(document.createElement("div"), { className: "settings-input-container", style: "display: flex; gap: 5px;" });
    const settingsInputLocationLabel = Object.assign(document.createElement("span"), { className: "settings-input-location-label", textContent: "Location", style: "flex: 1" });
    this.settingsInputLocation = Object.assign(document.createElement("input"), { className: "settings-input-location", type: "number", min: 0, max: 100, step: 0.1, style: "flex: 1; border: 0.5px solid white; border-radius: 3px; background: transparent; color: white; font: inherit;" });
    this.settingsButtonDelete = Object.assign(document.createElement("button"), { className: "settings-button-delete", style: "flex: 1; border: 0.5px solid white; color: white; background: #ffffff20; border-radius: 3px; font-size: 10px; cursor: pointer", textContent: "Delete" });
    settingsLabelContainer.append(settingsInputLocationLabel);
    settingsInputContainer.append(this.settingsInputLocation, this.settingsButtonDelete);
    settingsContainer.append(this.alphasContainer, this.gradient, this.colorsContainer, settingsLabelContainer, settingsInputContainer);
    this.container.append(settingsContainer, this.colorPicker.container);
    this.mouse = { down: false, x: 0 };
    this.selectedPicker = null;
    [this.alphasContainer, this.colorsContainer].forEach((gradientContainer) => gradientContainer.addEventListener("pointerdown", (event) => {
      this.mouse = { down: true, x: event.clientX };
      this.onPointerDown(gradientContainer, event.target);
    }));
    window.addEventListener("pointerup", (event) => {
      this.mouse = { down: false, x: event.clientX };
    });
    window.addEventListener("pointermove", (event) => {
      this.mouse = { down: this.mouse.down, x: event.clientX };
      this.onPointerMove();
    });
    this.settingsInputLocation.addEventListener("input", (event) => {
      if (this.selectedPicker === null) return;
      const left = this.clamp(parseFloat(this.settingsInputLocation.value), 0, 100) / 100 * 192;
      this.selectedPicker.style.left = `${left + 4}px`;
    });
    this.settingsButtonDelete.addEventListener("click", (event) => {
      if (this.selectedPicker === null) return;
      const index = this.pickersList.indexOf(this.selectedPicker);
      if (index === -1) throw Error("Selected picker not found in pickers list");
      this.pickersList.splice(index, 1);
      this.selectedPicker.remove();
      this.settingsInputLocation.value = "";
      this.updatePickerGradient();
    });
    setTimeout(() => {
      if (defaultGradient) this.setGradient(defaultGradient);
    }, 10);
  }
  setGradient(gradient) {
    this.alphasContainer.innerHTML = "";
    this.colorsContainer.innerHTML = "";
    this.pickersList = [];
    for (const key of gradient.colorKeys) this.addPicker("color", { r: key.r * 255, g: key.g * 255, b: key.b * 255, a: 255 }, key.t);
    for (const key of gradient.alphaKeys) this.addPicker("alpha", { r: 255, g: 255, b: 255, a: key.a * 255 }, key.t);
    this.updatePickerGradient();
  }
  clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }
  onPointerDown(container, target) {
    this.selectedPicker = target;
    const rect = container.getBoundingClientRect();
    if (!target.classList.contains("picker")) {
      const type2 = target === this.alphasContainer ? "alpha" : "color";
      const t = (this.mouse.x - rect.left) / rect.width;
      console.log(this.mouse.x, rect.left, rect.width, t);
      {
        const x = 10;
        const t2 = (x - rect.left) / rect.width;
        console.log(t2, rect.left, rect.width);
      }
      this.selectedPicker = this.addPicker(type2, { r: 0, g: 0, b: 0, a: 255 }, t);
    }
    const selectedPicker = this.selectedPicker;
    this.colorPicker.onColorChanged = (color2, alpha) => {
      selectedPicker.dataset.color = JSON.stringify({ r: color2.r, g: color2.g, b: color2.b, a: alpha });
      selectedPicker.style.background = `rgba(${color2.r}, ${color2.g}, ${color2.b}, ${alpha / 255})`;
      this.updatePickerGradient();
    };
    const color = JSON.parse(selectedPicker.dataset.color);
    const type = selectedPicker.dataset.type;
    this.colorPicker.setColorRGB(color.r, color.g, color.b, color.a);
    this.settingsInputLocation.value = `${(parseFloat(selectedPicker.style.left) / rect.width * 100).toFixed(2)}`;
    if (type === "alpha") this.colorPicker.disableColor(), this.colorPicker.enableAlpha();
    else this.colorPicker.enableColor(), this.colorPicker.disableAlpha();
    this.updatePickerGradient();
  }
  addPicker(type, color, t) {
    const container = type === "alpha" ? this.alphasContainer : this.colorsContainer;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) throw Error("Invalid rect width, GradientEditor cannot be hidden");
    const left = t * rect.width + 4;
    const picker = Object.assign(document.createElement("div"), { className: "picker", style: `width: 8px; height: 8px; background: rgba(${color.r},${color.g},${color.b},${color.a / 255}); position: absolute; left: ${left}px; border: 1px solid white; border-radius: 50%` });
    picker.dataset.color = JSON.stringify(color);
    picker.dataset.type = type;
    this.pickersList.push(picker);
    container.append(picker);
    return picker;
  }
  onPointerMove() {
    if (this.mouse.down === false || this.selectedPicker === null) return;
    const rect = this.selectedPicker.dataset.type === "alpha" ? this.alphasContainer.getBoundingClientRect() : this.colorsContainer.getBoundingClientRect();
    const left = this.clamp(this.mouse.x - rect.left, 0, rect.width);
    this.settingsInputLocation.value = `${(left / rect.width * 100).toFixed(2)}`;
    this.selectedPicker.style.left = `${left + 4}px`;
    this.updatePickerGradient();
  }
  colorAt(stops, t) {
    if (!stops.length) return { r: 0, g: 0, b: 0, a: 1 };
    if (t <= stops[0].t) return { ...stops[0] };
    if (t >= stops[stops.length - 1].t) return { ...stops[stops.length - 1] };
    let i = 0;
    while (!(t >= stops[i].t && t <= stops[i + 1].t)) i++;
    const a = stops[i];
    const b = stops[i + 1];
    const k = (t - a.t) / (b.t - a.t);
    const mix = (x, y) => Math.round(x + (y - x) * k);
    return { r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b), a: a.a + (b.a - a.a) * k };
  }
  updatePickerGradient() {
    const sorted = this.pickersList.sort((a, b) => {
      return parseInt(a.style.left) - parseInt(b.style.left);
    });
    const colorPickers = this.pickersList.filter((value) => value.dataset.type === "color");
    const stops = colorPickers.map(
      (value) => {
        const c = JSON.parse(value.dataset.color);
        return { r: c.r, g: c.g, b: c.b, a: c.a, t: parseFloat(value.style.left) - 4 / 192 };
      }
    );
    let gradient = { colorKeys: [], alphaKeys: [] };
    let colors = "";
    for (const picker of sorted) {
      const containerWidth = picker.parentElement.getBoundingClientRect().width;
      const percentage = (parseFloat(picker.style.left) - 4) / containerWidth * 100;
      let color = JSON.parse(picker.dataset.color);
      let type = picker.dataset.type;
      if (type === "alpha") {
        const alpha = color.a;
        color = this.colorAt(stops, percentage / 100);
        color.a = alpha;
      }
      colors += `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255}) ${percentage}%, `;
      if (type === "color") gradient.colorKeys.push({ r: color.r / 255, g: color.g / 255, b: color.b / 255, t: percentage / 100 });
      else if (type === "alpha") gradient.alphaKeys.push({ a: color.a / 255, t: percentage / 100 });
    }
    colors = colors.slice(0, colors.length - 2);
    this.gradient.style.background = `linear-gradient(to right, ${colors}), url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".05"><rect x="8" width="8" height="8"/><rect y="8" width="8" height="8"/></svg>'), white`;
    this.currentGradient = this.gradient.style.background;
    this.onChanged(gradient);
  }
}

export { GradientEditor };
