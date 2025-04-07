#!/bin/bash

set -euo pipefail
source $(dirname $0)/var-native.sh

LIB_PATH=modules/opus
CONF_FLAGS=(
  --prefix=$BUILD_DIR                                 # install library in a build directory for FFmpeg to include
  --host=i686-none                                    # use i686 linux
  --enable-shared=no                                  # not to build shared library
  --disable-asm                                       # not to use asm
  --disable-rtcd                                      # not to detect cpu capabilities
  --disable-intrinsics                                # not to use intrinsics
  --disable-doc                                       # not to build docs
  --disable-extra-programs                            # not to build demo and tests
  --disable-stack-protector
)
echo "CONF_FLAGS=${CONF_FLAGS[@]}"
(cd $LIB_PATH && \
  ./autogen.sh && \
  CFLAGS=$CFLAGS LDFLAGS=$LDFLAGS ./configure "${CONF_FLAGS[@]}")
make -C $LIB_PATH clean
make -C $LIB_PATH install -j