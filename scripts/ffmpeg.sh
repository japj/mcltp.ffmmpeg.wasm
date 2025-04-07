#!/bin/bash

set -euo pipefail
source $(dirname $0)/var.sh

LIB_PATH=/src

FLAGS=(
  --prefix=$BUILD_DIR
  --target-os=none        # use none to prevent any os specific configurations
  --arch=wasm32
  --cpu=generic
  --enable-cross-compile
  --disable-debug
  --disable-stripping
  --disable-programs
  --enable-ffmpeg
  --disable-runtime-cpudetect
  --disable-autodetect    # disable external libraries auto detect
  --disable-doc
  --disable-htmlpages
  --disable-manpages
  --disable-podpages
  --disable-txtpages
  --disable-avdevice
  --disable-postproc
  --disable-network
  --disable-everything
  --enable-avfilter
  --enable-filter=amerge
  --enable-filter=channelmap
  --enable-filter=aformat
  --enable-demuxer=wav
  --enable-demuxer=aiff
  --enable-decoder=pcm_*
  --enable-encoder=libopus
  --enable-muxer=ogg
  --enable-parser=opus
  --enable-libopus
  --enable-protocol=file
  --extra-cflags="$CFLAGS"
  --extra-cxxflags="$CXXFLAGS"
  --extra-ldflags="$LDFLAGS"
  --pkg-config-flags="--static"
  --nm=emnm
  --ar=emar
  --ranlib=emranlib
  --cc=emcc
  --cxx=em++
  --objcc=emcc
  --dep-cc=emcc
)

sed -i 's/    librubberband//g' $LIB_PATH/configure
sed -i 's/    vapoursynth/librubberband\nvapoursynth/g' $LIB_PATH/configure

echo "FFMPEG_CONFIG_FLAGS=${FLAGS[@]}"
(cd $LIB_PATH && \
    PKG_CONFIG_PATH=/src/build/lib/pkgconfig && \
    emconfigure ./configure "${FLAGS[@]}")



# build

LIB_PATH=/src
INFO_FILE=$WASM_DIR/$OUTPUT_FILENAME.txt

mkdir -p $WASM_DIR

FLAGS=(
  $LDFLAGS

  # Common
  -I. -I./fftools -I./compat/stdbit -I$BUILD_DIR/include
  -Llibavcodec -Llibavdevice -Llibavfilter -Llibavformat -Llibavresample -Llibavutil -Llibswscale -Llibswresample
  -Wno-deprecated-declarations -Wno-pointer-sign -Wno-implicit-int-float-conversion -Wno-switch -Wno-parentheses -Qunused-arguments
  #-lavdevice 
  -lavfilter -lavformat -lavcodec -lswresample -lswscale -lavutil 
  #-lm

  # Features
  #-laom
  #-lSvtAv1Enc -LSvtAv1Enc -Llibstvav1
  #-lopenh264
  #-lkvazaar
  #-lvpx
  #-lmp3lame
  #-lvorbis -lvorbisenc -lvorbisfile
  #-logg
  #-ltheora -ltheoraenc -ltheoradec
  #-lz
  -lopus
  #-lwebp -lwebpmux -lsharpyuv
  #-lrubberband -lsamplerate -Lrubberband -Lsamplerate

  # Goes after `-l -L` switches see: https://gitlab.com/AOMediaCodec/SVT-AV1/-/issues/2052
  fftools/cmdutils.c
  fftools/objpool.c
  fftools/ffmpeg.c
  fftools/ffmpeg_dec.c
  fftools/ffmpeg_demux.c
  fftools/ffmpeg_enc.c
  fftools/ffmpeg_filter.c
  fftools/ffmpeg_hw.c
  fftools/ffmpeg_mux.c
  fftools/ffmpeg_mux_init.c
  fftools/ffmpeg_opt.c
  fftools/ffmpeg_sched.c
  fftools/opt_common.c
  fftools/sync_queue.c
  fftools/thread_queue.c

  # Emscripten
  -lworkerfs.js
  #-s USE_SDL=2
  -s WASM_BIGINT
  -s MALLOC=mimalloc                   # available since 3.1.50
#  -s EXPORT_ES6=1                     # https://github.com/emscripten-core/emscripten/issues/22508
#  -s STRICT=1                         # 3.1.65 wasm-ld: error: lto.tmp: undefined symbol: __syscall_geteuid32
  -s INVOKE_RUN=0
  -s EXIT_RUNTIME=1
  -s MODULARIZE=1
  -s EXPORT_NAME="createFFmpeg"
  -s EXPORTED_FUNCTIONS="[_main, ___wasm_init_memory_flag]"
  -s EXPORTED_RUNTIME_METHODS="[callMain, FS, WORKERFS]"
  -s INITIAL_MEMORY=96mb
  -s ALLOW_MEMORY_GROWTH=1
  -s MAXIMUM_MEMORY=4gb
  -s ENVIRONMENT=worker
  -s PROXY_TO_PTHREAD=1
  -s STACK_SIZE=5MB                     # required since 3.1.27 (Uncaught Infinity runtime error)
  -s DEFAULT_PTHREAD_STACK_SIZE=2MB     # required since 3.1.27 (Uncaught Infinity runtime error)
  -o $OUTPUT_PATH
)

echo "FFMPEG_EM_FLAGS=${FLAGS[@]}"
(cd $LIB_PATH && \
    emmake make -j4 && \
    emcc "${FLAGS[@]}")

echo "emcc ${FLAGS[@]}" > $INFO_FILE
echo "" >> $INFO_FILE

# git config --get remote.origin.url >> $INFO_FILE
# git rev-parse HEAD >> $INFO_FILE
# echo "" >> $INFO_FILE

# echo "EMCC (emcc -v)" >> $INFO_FILE
# emcc -v &>> $INFO_FILE
# echo "" >> $INFO_FILE

# git submodule foreach 'git config --get remote.origin.url && git rev-parse HEAD && echo ""' >> $INFO_FILE