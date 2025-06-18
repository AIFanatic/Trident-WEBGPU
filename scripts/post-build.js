const fs = require("fs");
fs.cpSync('./src/plugins', './dist/esm/plugins', { recursive: true });
fs.cpSync('./src/renderer/webgpu/shaders', './dist/esm/renderer/webgpu/shaders', { recursive: true });