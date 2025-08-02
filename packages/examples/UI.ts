import { UIFolder, UIGraph, UISliderStat, UITextStat } from "../plugins/ui/UIStats";

// const ui = new UIStats();
// ui.AddSlider("Test", 0, 10, 0.1, 5, v => {})

// ui.AddTextStat("Test", 10);

const container = document.createElement("div");
container.classList.add("stats-panel");

document.body.appendChild(container);

const ui = new UIFolder(container, "Main");
const s = new UISliderStat(ui, "Test", 0, 10, 0.1, 5, v => {});
// ui.AddSlider("Test", 0, 10, 0.1, 5, v => {})
const f = new UIFolder(ui, "Test");
const t = new UITextStat(f, "TTTT", 20);

const g = new UIGraph(f, "Graph");

setInterval(() => {
    g.addValue(Math.random() * 50)
}, 100);

ui.Open()