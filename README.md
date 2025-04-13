# FFmpeg for Multi Channel Learning Tracks Playback

This is part of proof of concept for a [MultiChannel Opus Player](https://www.japj.net/2025/03/23/multichannel-opus-player-proof-of-concept) for playing Learning Tracks.

This uses:
- FFmpeg: a stripped down, audio only WASM compiled version
- plain js/html/css to showcase the concept of the endoding (using the audio-only FFmpeg WASM)

## TODO

- TTY handler, also flush during CR (_val === 13_, to get progress updates to console log)
  possibly handle this post build like wv does?
  ```js
  default_tty_ops: {
        get_char(tty) {
          return FS_stdin_getChar();
        },
        put_char(tty, val) {
          if (val === null || val === 10 || val === 13) { // added val == 13
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  }
```