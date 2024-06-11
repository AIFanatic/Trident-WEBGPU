/// <reference types="@webgpu/types" />

import { mat4, vec3 } from 'wgpu-matrix';
import { GUI } from 'dat.gui';
import normalMapWGSL from './normalMap.wgsl';
import { createMeshRenderable } from './mesh';
import { createBoxMeshWithTangents } from './box';
import {
  createBindGroupDescriptor,
  create3DRenderPipeline,
  createTextureFromImage,
} from './utils';

const MAT4X4_BYTES = 64;
const canvas = document.createElement("canvas");
canvas.width = window.innerWidth * 0.5;
canvas.height = window.innerHeight * 0.5;
console.log(window.innerWidth)
document.body.appendChild(canvas);
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu') as GPUCanvasContext;
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device,
  format: presentationFormat,
  alphaMode: 'premultiplied',
});


// Create normal mapping resources and pipeline
const depthTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: 'depth24plus',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const spaceTransformsBuffer = device.createBuffer({
  // Buffer holding projection, view, and model matrices plus padding bytes
  size: MAT4X4_BYTES * 4,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const mapInfoBuffer = device.createBuffer({
  // Buffer holding mapping type, light uniforms, and depth uniforms
  size: Float32Array.BYTES_PER_ELEMENT * 8,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});


let brickwallAlbedoTexture: GPUTexture;
{
  const response = await fetch('./assets/textures/brick-wall-unity/brick-wall_albedo.png');
  const imageBitmap = await createImageBitmap(await response.blob());
  brickwallAlbedoTexture = createTextureFromImage(device, imageBitmap);
}

let brickwallNormalTexture: GPUTexture;
{
  const response = await fetch('./assets/textures/brick-wall-unity/brick-wall_normal-ogl.png');
  const imageBitmap = await createImageBitmap(await response.blob());
  brickwallNormalTexture = createTextureFromImage(device, imageBitmap);
}

let brickwallHeightTexture: GPUTexture;
{
  const response = await fetch('./assets/textures/brick-wall-unity/brick-wall_height.png');
  const imageBitmap = await createImageBitmap(await response.blob());
  brickwallHeightTexture = createTextureFromImage(device, imageBitmap);
}

// Create a sampler with linear filtering for smooth interpolation.
const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
});

const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later

      clearValue: [0, 0, 0, 1],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    view: depthTexture.createView(),

    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
};

const box = createMeshRenderable(
  device,
  createBoxMeshWithTangents(1.0, 1.0, 1.0)
);

// Uniform bindGroups and bindGroupLayout
const frameBGDescriptor = createBindGroupDescriptor(
  [0, 1],
  [
    GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
    GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
  ],
  ['buffer', 'buffer'],
  [{ type: 'uniform' }, { type: 'uniform' }],
  [[{ buffer: spaceTransformsBuffer }, { buffer: mapInfoBuffer }]],
  'Frame',
  device
);

// Texture bindGroups and bindGroupLayout
const surfaceBGDescriptor = createBindGroupDescriptor(
  [0, 1, 2, 3],
  [GPUShaderStage.FRAGMENT],
  ['sampler', 'texture', 'texture', 'texture'],
  [
    { type: 'filtering' },
    { sampleType: 'float' },
    { sampleType: 'float' },
    { sampleType: 'float' },
  ],
  // Multiple bindgroups that accord to the layout defined above
  [
    [
      sampler,
      brickwallNormalTexture.createView(),
      brickwallAlbedoTexture.createView(),
      brickwallHeightTexture.createView(),
    ],
  ],
  'Surface',
  device
);

const aspect = canvas.width / canvas.height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 0.1, 10.0);

function getViewMatrix() {
  return mat4.lookAt(
    [0.0, 0.8, -1.4,],
    [0, 0, 0],
    [0, 1, 0]
  );
}

function getModelMatrix() {
  const modelMatrix = mat4.create();
  mat4.identity(modelMatrix);
  const now = Date.now() / 1000;
  mat4.rotateY(modelMatrix, now * -0.5, modelMatrix);
  return modelMatrix;
}


const texturedCubePipeline = create3DRenderPipeline(
  device,
  'NormalMappingRender',
  [frameBGDescriptor.bindGroupLayout, surfaceBGDescriptor.bindGroupLayout],
  normalMapWGSL,
  // Position,   normal       uv           tangent      bitangent
  ['float32x3', 'float32x3', 'float32x2', 'float32x3', 'float32x3'],
  normalMapWGSL,
  presentationFormat,
  true
);

let currentSurfaceBindGroup = 0;

function frame() {
  // Update spaceTransformsBuffer
  const viewMatrix = getViewMatrix();
  const worldViewMatrix = mat4.mul(viewMatrix, getModelMatrix());
  const worldViewProjMatrix = mat4.mul(projectionMatrix, worldViewMatrix);
  const matrices = new Float32Array([
    ...worldViewProjMatrix,
    ...worldViewMatrix,
  ]);

  device.queue.writeBuffer(
    spaceTransformsBuffer,
    0,
    matrices.buffer,
    matrices.byteOffset,
    matrices.byteLength
  );


  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  // Draw textured Cube
  passEncoder.setPipeline(texturedCubePipeline);
  passEncoder.setBindGroup(0, frameBGDescriptor.bindGroups[0]);
  passEncoder.setBindGroup(
    1,
    surfaceBGDescriptor.bindGroups[currentSurfaceBindGroup]
  );
  passEncoder.setVertexBuffer(0, box.vertexBuffer);
  passEncoder.setIndexBuffer(box.indexBuffer, 'uint16');
  passEncoder.drawIndexed(box.indexCount);
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
