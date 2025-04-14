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
-s EXPORTED_RUNTIME_METHODS="['cwrap', 'ccall']" \
-s EXPORTED_FUNCTIONS="['_malloc', '_meshopt_simplifyWithAttributes', '_meshopt_simplifySloppy', '_meshopt_generateShadowIndexBuffer']" \
./src/clusterizer.cpp ./src/simplifier.cpp ./src/indexgenerator.cpp \
-o ../MeshOptimizerModule.js

cd ..

cp ./MeshOptimizerModule.wasm ../../../../dist/MeshOptimizerModule.wasm