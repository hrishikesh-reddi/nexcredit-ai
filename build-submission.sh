#!/usr/bin/env bash
# Build the Synchrony submission archive without generated data or secrets.
# The externally submitted files remain roll-number-only:
#   submission/SE23UCSE065.zip
#   submission/SE23UCSE065.pdf (prepared separately, copied into the ZIP if present)
set -euo pipefail
export LC_ALL=C
export LANG=C

ROLL="SE23UCSE065"
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/submission"
SUBMISSION_SOURCES="$OUT/$ROLL"
DEMO="$SUBMISSION_SOURCES/$ROLL.mp4"
FINAL_PDF="$OUT/$ROLL.pdf"
ZIP="$OUT/$ROLL.zip"
REPRODUCIBLE_TIMESTAMP="200001010000"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

validate_demo_video() {
  local video="$1"

  [[ -s "$video" ]] || fail "required demo video is missing or empty: $video"

  if command -v ffprobe >/dev/null 2>&1; then
    local format_name video_stream duration
    format_name="$(ffprobe -v error -show_entries format=format_name \
      -of default=noprint_wrappers=1:nokey=1 "$video" 2>/dev/null || true)"
    video_stream="$(ffprobe -v error -select_streams v:0 \
      -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 \
      "$video" 2>/dev/null || true)"
    duration="$(ffprobe -v error -show_entries format=duration \
      -of default=noprint_wrappers=1:nokey=1 "$video" 2>/dev/null || true)"

    [[ "$format_name" == *mp4* || "$format_name" == *mov* ]] || \
      fail "demo is not a valid MP4 video: $video"
    [[ "$video_stream" == "video" ]] || \
      fail "demo is not a valid MP4 video (no video stream): $video"
    awk -v value="$duration" 'BEGIN { exit !(value + 0 > 0) }' || \
      fail "demo is not a valid MP4 video (invalid duration): $video"
  else
    local mime_type
    mime_type="$(file -b --mime-type "$video" 2>/dev/null || true)"
    [[ "$mime_type" == "video/mp4" ]] || \
      fail "demo is not a valid MP4 video: $video"
  fi
}

[[ -f "$ROOT/README.md" ]] || fail "project README is missing: $ROOT/README.md"
[[ -d "$SUBMISSION_SOURCES" ]] || \
  fail "submission source directory is missing: $SUBMISSION_SOURCES"

validate_demo_video "$DEMO"

command -v rsync >/dev/null 2>&1 || fail "rsync is required to build the submission"
command -v zip >/dev/null 2>&1 || fail "zip is required to build the submission"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
BUNDLE="$TMP/bundle"
CODE="$BUNDLE/$ROLL-code"
mkdir -p "$BUNDLE" "$CODE" "$OUT"

echo "==> Building verified submission bundle for $ROLL"

# Copy the curated submission companions. The README is overwritten below with
# the repository's current README so a stale maintained copy cannot be shipped.
while IFS= read -r -d '' companion; do
  cp "$companion" "$BUNDLE/$(basename "$companion")"
done < <(find "$SUBMISSION_SOURCES" -maxdepth 1 -type f \
  ! -name "$ROLL.mp4" -print0)
cp "$ROOT/README.md" "$BUNDLE/$ROLL-readme.md"
cp "$DEMO" "$BUNDLE/$ROLL.mp4"

if [[ -f "$FINAL_PDF" ]]; then
  cp "$FINAL_PDF" "$BUNDLE/$ROLL.pdf"
  echo "    included final report: $FINAL_PDF"
else
  echo "    NOTE: final report not found at $FINAL_PDF; ZIP will contain its Markdown source only"
fi

echo "==> Creating current source snapshot"
rsync -a --safe-links \
  --include='.env.example' \
  --exclude='.git' \
  --exclude='.github-cache' \
  --exclude='.idea' \
  --exclude='.DS_Store' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.pem' \
  --exclude='*.key' \
  --exclude='*.p12' \
  --exclude='*.jks' \
  --exclude='credentials*.json' \
  --exclude='secrets' \
  --exclude='submission' \
  --exclude='uploads' \
  --exclude='node_modules' \
  --exclude='src/frontend/node' \
  --exclude='build' \
  --exclude='dist' \
  --exclude='target' \
  --exclude='coverage' \
  --exclude='*.class' \
  --exclude='*.log' \
  "$ROOT/" "$CODE/"

# Fixed timestamps, stable path order, and stripped ZIP metadata make repeated
# builds from identical content byte-for-byte reproducible.
find "$BUNDLE" -type f -exec touch -t "$REPRODUCIBLE_TIMESTAMP" {} +

echo "==> Writing $ZIP"
rm -f "$ZIP"
(
  cd "$BUNDLE"
  find . -type f -print | LC_ALL=C sort | zip -X -q "$ZIP" -@
)

[[ -s "$ZIP" ]] || fail "ZIP creation failed: $ZIP"
validate_demo_video "$DEMO"

echo "==> Done: $ZIP"
echo "    Validated video: $ROLL.mp4"
echo "    Submit $ROLL.zip and $ROLL.pdf to Technologyinterns@syf.com."
