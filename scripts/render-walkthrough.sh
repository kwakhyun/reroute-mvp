#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NARRATION_TEXT="$PROJECT_ROOT/docs/walkthrough-narration.txt"
OUTPUT_VIDEO="$PROJECT_ROOT/public/portfolio/reroute-walkthrough.mp4"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/reroute-walkthrough.XXXXXX")"
NARRATION_AUDIO="$TEMP_DIR/narration.aiff"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

command -v say >/dev/null 2>&1 || {
  echo "macOS say command is required to render the Korean narration." >&2
  exit 1
}

command -v ffmpeg >/dev/null 2>&1 || {
  echo "ffmpeg is required to render the walkthrough video." >&2
  exit 1
}

say -v Yuna -r 170 -f "$NARRATION_TEXT" -o "$NARRATION_AUDIO"

FRAMES=(
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/01-case-study-hero.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/02-matching.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/03-confirmation.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/04-pickups.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/05-settlement.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/06-isolation.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/07-validation.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/10-report.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/08-engineering.png"
  "$PROJECT_ROOT/public/portfolio/walkthrough-frames/09-ownership.png"
)

DURATIONS=(24 32 22 18 14 26 35 22 25 23)

for index in "${!FRAMES[@]}"; do
  frame="${FRAMES[$index]}"
  duration="${DURATIONS[$index]}"
  clip="$TEMP_DIR/clip-$index.mp4"

  test -f "$frame" || {
    echo "Missing walkthrough frame: $frame" >&2
    exit 1
  }

  ffmpeg -hide_banner -loglevel error -y \
    -loop 1 -framerate 24 -t "$duration" -i "$frame" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x08111f,setsar=1,format=yuv420p" \
    -r 24 -an -c:v libx264 -preset fast -crf 24 "$clip"
done

CONCAT_FILE="$TEMP_DIR/clips.txt"
for index in "${!FRAMES[@]}"; do
  printf "file '%s'\n" "$TEMP_DIR/clip-$index.mp4" >> "$CONCAT_FILE"
done

ffmpeg -hide_banner -loglevel error -y \
  -f concat -safe 0 -i "$CONCAT_FILE" \
  -i "$NARRATION_AUDIO" \
  -map 0:v:0 -map 1:a:0 -shortest \
  -c:v copy -c:a aac -b:a 160k -movflags +faststart \
  "$OUTPUT_VIDEO"

ffprobe -v error \
  -show_entries format=duration,size:stream=codec_name,width,height \
  -of default=noprint_wrappers=1 "$OUTPUT_VIDEO"
