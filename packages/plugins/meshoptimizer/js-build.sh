#!/bin/bash

cd 47aafa5

emcc \
-O3 \
-s WASM=1 \
-s ALLOW_MEMORY_GROWTH=1 \
-s EXPORT_ES6=1 \
-s MODULARIZE=1 \
-s SINGLE_FILE=1 \
-s ENVIRONMENT=web,node \
-s ASSERTIONS=1 \
-s EXPORTED_RUNTIME_METHODS="['HEAPU32', 'HEAPF32', 'cwrap', 'ccall']" \
-s EXPORTED_FUNCTIONS="['_malloc', '_meshopt_simplify', '_meshopt_simplifyWithAttributes', '_meshopt_simplifySloppy', '_meshopt_generateShadowIndexBuffer', '_meshopt_buildMeshletsBound', '_meshopt_buildMeshlets', '_meshopt_computeClusterBounds', '_meshopt_computeMeshletBounds']" \
./src/clusterizer.cpp ./src/simplifier.cpp ./src/indexgenerator.cpp \
-o ../MeshOptimizerModule.js

cd ..
