./build/native/bin/ffmpeg -i ./data/shower-the-people/S.wav -i ./data/shower-the-people/A.wav -i ./data/shower-the-people/T.wav -i ./data/shower-the-people/B.wav -i ./data/shower-the-people/S-P.wav -i ./data/shower-the-people/S-P.wav -i ./data/shower-the-people/T-P.wav -i ./data/shower-the-people/B-P.wav \
-filter_complex "[0:a][1:a][2:a][3:a][4:a][5:a][6:a][7:a]amerge=inputs=8[aout]" \
-map "[aout]" -c:a libopus -b:a 288k -metadata comment="Channel order: S, A, T, B, S-P, A-P, T-P, B-P" ./data/shower-the-people/minimal-output-no-click.opus


./build/native/bin/ffmpeg -i ./data/shower-the-people/S.wav -i ./data/shower-the-people/A.wav -i ./data/shower-the-people/T.wav -i ./data/shower-the-people/B.wav -i ./data/shower-the-people/S-P.wav -i ./data/shower-the-people/A-P.wav -i ./data/shower-the-people/T-P.wav -i ./data/shower-the-people/B-P.wav -i ./data/shower-the-people/Click.wav \
-filter_complex "[0:a][1:a][2:a][3:a][4:a][5:a][6:a][7:a][8:a]amerge=inputs=9[aout]" \
-map "[aout]" -c:a libopus -b:a 288k -mapping_family 255 \
-metadata comment="Channel order: S, A, T, B, S-P, A-P, T-P, B-P, Click" \
./data/shower-the-people/minimal-output.opus


# ffplay -i ./data/shower-the-people/output.opus

# To play just the soprano channel (first channel)
#ffmpeg -i ./data/shower-the-people/output.opus -af "pan=mono|c0=c0" -f sdl "Soprano"

# To play just the click track (last channel)
#ffmpeg -i ./data/shower-the-people/output.opus -af "pan=mono|c0=c8" -f sdl "Click Track"