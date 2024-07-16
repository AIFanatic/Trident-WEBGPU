#!/bin/bash

emcc \
-O3 \
-s WASM=1 \
-s ALLOW_MEMORY_GROWTH=1 \
-s EXPORT_ES6=1 \
-s MODULARIZE=1 \
-s ENVIRONMENT=web \
-s ASSERTIONS=1 \
-s EXPORTED_RUNTIME_METHODS="['cwrap', 'ccall']" \
-s EXPORTED_FUNCTIONS="['_malloc', '_meshopt_computeClusterBounds', '_meshopt_buildMeshletsBound', '_meshopt_buildMeshlets', '_meshopt_simplify', '_meshopt_generateVertexRemap', '_meshopt_remapIndexBuffer', '_meshopt_remapVertexBuffer', '_meshopt_simplifyScale']" \
./repo/src/clusterizer.cpp ./repo/src/simplifier.cpp ./repo/src/indexgenerator.cpp \
-o ./MeshOptimizer.js

cp ./MeshOptimizer.wasm ../../../../dist/MeshOptimizer.wasm
# -o ../../../../dist/MeshOptimizer.js