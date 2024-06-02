ECS:
    GameObject [P]
    Transform  [P] - TODO: Add parent
    Scene      [P]

Core:
    Shader - class in UnityEngine/Inherits from:Object/Implemented in:UnityEngine.CoreModule
    Material - class in UnityEngine/Inherits from:Object/Implemented in:UnityEngine.CoreModule
    Mesh - class in UnityEngine/Inherits from:Object/Implemented in:UnityEngine.CoreModule
    MeshFilter - class in UnityEngine/Inherits from:Component/Implemented in:UnityEngine.CoreModule
    MeshRenderer - class in UnityEngine/Inherits from:Renderer/Implemented in:UnityEngine.CoreModule
    Graphics - class in UnityEngine/Implemented in:UnityEngine.CoreModule

TODO: - Interleaved normal buffer
      - Mesh should be able to render vertices only without indices (points)
      - Add drawIndirect/drawIndexedIndirect
      - Add sub passes
      - Geometry should calculate CRC from vertices and indices (MeshCache/Sponza)