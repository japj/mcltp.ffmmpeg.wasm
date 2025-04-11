# FFmpeg for Multi Channel Learning Tracks Playback

## TODO

- TTY handler, also flush during CR (to get progress updates to console log)
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
```