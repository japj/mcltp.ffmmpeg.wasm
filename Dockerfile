# syntax=docker/dockerfile-upstream:master-labs

# Base emsdk image with environment variables.
FROM emscripten/emsdk:4.0.6-arm64 AS emsdk-base
ARG EXTRA_CFLAGS
ARG EXTRA_LDFLAGS
ARG FFMPEG_ST
ARG FFMPEG_MT
ENV INSTALL_DIR=/src/build

ENV FFMPEG_VERSION=n7.1.1
ENV CFLAGS="-I$INSTALL_DIR/include $CFLAGS $EXTRA_CFLAGS"
ENV CXXFLAGS="$CFLAGS"
ENV LDFLAGS="-L$INSTALL_DIR/lib $LDFLAGS $CFLAGS $EXTRA_LDFLAGS"
ENV EM_PKG_CONFIG_PATH=$EM_PKG_CONFIG_PATH:$INSTALL_DIR/lib/pkgconfig:/emsdk/upstream/emscripten/system/lib/pkgconfig
ENV EM_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake
ENV PKG_CONFIG_PATH=$PKG_CONFIG_PATH:$EM_PKG_CONFIG_PATH
RUN apt-get update && \
      apt-get install -y pkg-config autoconf automake libtool ragel

# Build opus
FROM emsdk-base AS opus-builder
ENV OPUS_BRANCH=v1.4
ADD https://github.com/japj/mcltp.opus.git#$OPUS_BRANCH /src
COPY scripts/opus.sh /src/build.sh
COPY scripts/var.sh /src/var.sh
RUN bash -x /src/build.sh

# Base ffmpeg image with dependencies and source code populated.
FROM emsdk-base AS ffmpeg-base
ADD https://github.com/japj/mcltp.FFmpeg.git#$FFMPEG_VERSION /src
COPY --from=opus-builder $INSTALL_DIR $INSTALL_DIR

FROM ffmpeg-base AS ffmpeg-builder
COPY scripts/ffmpeg.sh /src/build.sh
COPY scripts/var.sh /src/var.sh
RUN bash -x /src/build.sh

# Export ffmpeg-core.wasm to dist/, use `docker buildx build -o . .` to get assets
FROM scratch AS exportor
COPY --from=ffmpeg-builder /src/wasm /dist