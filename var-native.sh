#!/bin/bash

set -euo pipefail

ROOT_DIR=$PWD
BUILD_DIR=$ROOT_DIR/build/native
PKG_CONFIG_PATH=$BUILD_DIR/lib/pkgconfig

# `-Og` -> no optimization
# `-g` -> debug info enabled
CFLAGS="-O3 -flto -I$BUILD_DIR/include"

export CFLAGS=$CFLAGS
export CXXFLAGS=$CFLAGS
export LDFLAGS="$CFLAGS -L$BUILD_DIR/lib"
export PKG_CONFIG_PATH=$PKG_CONFIG_PATH

echo "CFLAGS=$CFLAGS"
echo "CXXFLAGS=$CXXFLAGS"
echo "LDFLAGS=$LDFLAGS"
echo "BUILD_DIR=$BUILD_DIR"