<p align="center">
  <img src="./repo/logo.png">
</p>

---

A game engine for the web.

The goal of Trident is to provide a fully featured game engine for the web without the learning curve.
Therefore it implements an entity-component-system that closely resembles Unity.

[Documentation (TODO)](./docs/) — [Examples](./packages/examples/) — [Editor](https://aifanatic.github.io/Trident-WEBGPU/dist/editor/)

## Features
* Automatic dynamic LOD
* Frustum culling
* Backface culling
* Occlusion culling (HiZ)
* Small features culling
* Render graph
* Instanced meshes
* Unity like API
* Cascaded shadow maps
* PBR (with albedo, height and normal map support)
* GPU driven
* Deferred rendering
* WEBGPU

Note this project is mostly experimental meaning that the features listed above are implemented but they may have bugs or not be cohesive with one another.


## Credits
This was built based on a lot of open source resources online, such as @zeux meshoptimizer/niagara etc.
<br>
Credit was not always given and apologies for that, when the project stabilizes a bit it will be updated with the proper sources, if you see some portions of your code feel free to reach out and it will be updated.

## License
MIT