#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
export LANG=C

ROLL="SE23UCSE065"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$(mktemp -d)"
trap 'rm -rf "$FIXTURE"' EXIT

cp "$PROJECT_ROOT/build-submission.sh" "$FIXTURE/build-submission.sh"
chmod +x "$FIXTURE/build-submission.sh"
mkdir -p "$FIXTURE/submission/$ROLL"
printf '# Fixture project\n' > "$FIXTURE/README.md"
printf '# Demo script\n' > "$FIXTURE/submission/$ROLL/$ROLL-demo-script.md"

assert_fails_with() {
  local expected="$1"
  shift
  local output
  if output="$({ "$@"; } 2>&1)"; then
    echo "Expected command to fail: $*" >&2
    exit 1
  fi
  if [[ "$output" != *"$expected"* ]]; then
    echo "Expected failure to contain '$expected', got:" >&2
    echo "$output" >&2
    exit 1
  fi
}

assert_zip_excludes() {
  local archive="$1"
  local forbidden="$2"
  if unzip -Z1 "$archive" | grep -F "$forbidden" >/dev/null; then
    echo "Archive unexpectedly contains: $forbidden" >&2
    exit 1
  fi
}

assert_zip_contains() {
  local archive="$1"
  local required="$2"
  if ! unzip -Z1 "$archive" | grep -Fx "$required" >/dev/null; then
    echo "Archive is missing: $required" >&2
    unzip -Z1 "$archive" >&2
    exit 1
  fi
}

assert_fails_with "required demo video" "$FIXTURE/build-submission.sh"

printf 'RIFF this is a WAV payload renamed as MP4\n' > \
  "$FIXTURE/submission/$ROLL/$ROLL.mp4"
assert_fails_with "not a valid MP4 video" "$FIXTURE/build-submission.sh"

ffmpeg -loglevel error -f lavfi -i color=c=navy:s=160x90:d=1 \
  -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart -y \
  "$FIXTURE/submission/$ROLL/$ROLL.mp4"

printf 'final report\n' > "$FIXTURE/submission/$ROLL.pdf"
mkdir -p "$FIXTURE/uploads" "$FIXTURE/node_modules/pkg" "$FIXTURE/build" \
  "$FIXTURE/target" "$FIXTURE/src/frontend/node" "$FIXTURE/submission/archive"
printf 'secret\n' > "$FIXTURE/.env"
printf 'secret\n' > "$FIXTURE/.env.production"
printf 'private key\n' > "$FIXTURE/server.pem"
printf 'uploaded document\n' > "$FIXTURE/uploads/customer.txt"
printf 'dependency\n' > "$FIXTURE/node_modules/pkg/index.js"
printf 'artifact\n' > "$FIXTURE/build/output.js"
printf 'artifact\n' > "$FIXTURE/target/output.class"
printf 'downloaded runtime\n' > "$FIXTURE/src/frontend/node/node"
printf 'stale archive\n' > "$FIXTURE/submission/archive/old.zip"

"$FIXTURE/build-submission.sh"
ARCHIVE="$FIXTURE/submission/$ROLL.zip"

assert_zip_contains "$ARCHIVE" "$ROLL.mp4"
assert_zip_contains "$ARCHIVE" "$ROLL.pdf"
assert_zip_contains "$ARCHIVE" "$ROLL-code/README.md"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/submission/"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/uploads/"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/node_modules/"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/build/"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/target/"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/src/frontend/node/"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/.env"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/.env.production"
assert_zip_excludes "$ARCHIVE" "$ROLL-code/server.pem"

FIRST_SHA="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
touch "$FIXTURE/README.md" "$FIXTURE/submission/$ROLL/$ROLL-demo-script.md"
"$FIXTURE/build-submission.sh"
SECOND_SHA="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"

if [[ "$FIRST_SHA" != "$SECOND_SHA" ]]; then
  echo "Archive is not reproducible: $FIRST_SHA != $SECOND_SHA" >&2
  exit 1
fi

echo "build-submission.sh tests passed"
