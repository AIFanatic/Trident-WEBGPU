#!/bin/bash

cd repo

gcc \
-O3
-I include \
-I libmetis \
-I GKlib \
./{GKlib,libmetis}/*.c
#-o ../Metis.js

cd ..
