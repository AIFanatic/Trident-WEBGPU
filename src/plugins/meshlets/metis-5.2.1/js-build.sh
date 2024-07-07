#!/bin/bash

emcc \
-O3 -s WASM=1 \
-s ALLOW_MEMORY_GROWTH=1 \
-s MODULARIZE=1 \
-s EXPORT_ES6=1 \
-s ENVIRONMENT=web \
-s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
-s EXPORTED_FUNCTIONS='["_malloc","_METIS_PartGraphKway"]' \
-I include \
-I libmetis \
-I GKlib \
./{GKlib,libmetis}/*.c \
-o Metis.js

cp ./Metis.wasm ../../../../dist/Metis.wasm
