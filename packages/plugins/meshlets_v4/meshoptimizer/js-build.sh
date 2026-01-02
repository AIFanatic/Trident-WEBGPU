#!/bin/bash

cd ec2ee8b

emcc \
-O3 \
-s WASM=1 \
-s ALLOW_MEMORY_GROWTH=1 \
-s EXPORT_ES6=1 \
-s MODULARIZE=1 \
-s SINGLE_FILE=1 \
-s ENVIRONMENT=web,node \
-s ASSERTIONS=1 \
-s EXPORTED_RUNTIME_METHODS="['cwrap', 'ccall', 'HEAPF32', 'HEAPU32', 'HEAPU8']" \
-s EXPORTED_FUNCTIONS="['_malloc', '_nanite', '_group_count', '_meshlet_count', '_meshlet_indices_count', '_group_ptr', '_meshlet_ptr', '_meshlet_indices_ptr']" \
./src/clusterizer.cpp ./src/simplifier.cpp ./src/indexgenerator.cpp ./src/partition.cpp ./src/spatialorder.cpp ../nanite_wrapper.cpp \
-o ../MeshOptimizerModule.js