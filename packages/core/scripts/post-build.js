const fs = require("fs");

const from = `${__dirname}/../src/renderer/webgpu/shaders`;
const to = `${__dirname}/../dist/renderer/webgpu/shaders`;
console.log(`Copying from ${from} to ${to}`);

try { fs.mkdirSync(to); } catch {}
fs.cpSync(from, to, { recursive: true });
