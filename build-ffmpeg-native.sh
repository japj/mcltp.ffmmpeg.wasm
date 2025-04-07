set -eo pipefail
source $(dirname $0)/var-native.sh

LIB_PATH=modules/ffmpeg

FLAGS=(
  --prefix=$BUILD_DIR
  --disable-programs
  --enable-ffmpeg
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
)

  (cd $LIB_PATH && \
    ./configure "${FLAGS[@]}")

make -C $LIB_PATH clean
make -C $LIB_PATH install -j