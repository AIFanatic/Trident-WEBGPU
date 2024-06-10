[Live demo](https://aifanatic.github.io/Trident-WEBGPU/dist/index.html)

ECS:
* GameObject [P]
* Transform  [P] - TODO: Add parent
* Scene      [P]

TODO:
* Interleaved normal buffer
* Mesh should be able to render vertices only without indices (points)
* Add drawIndirect/drawIndexedIndirect
* Add sub passes
* Geometry should calculate CRC from vertices and indices (MeshCache/Sponza)



* Mesh cache sucks shader/geometry keys cant be unique per instance they need to be unique per mesh or something dunno

* CompileGeometry hardcodes the attributes and stuff which are part of the shader