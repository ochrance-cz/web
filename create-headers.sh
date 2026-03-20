#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FILE="public/_headers"

# start fresh
: > "$OUTPUT_FILE"

for dir in public/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")

  if [ "$name" = "admin" ]; then
    continue
  fi

  cat <<EOF >> "$OUTPUT_FILE"
/${name}/*
  Basic-Auth: ${PREVIEW_LOGIN}

EOF

done

for file in public/*; do
  [ -f "$file" ] || continue
  name=$(basename "$file")

  cat <<EOF >> "$OUTPUT_FILE"
/${name}
  Basic-Auth: ${PREVIEW_LOGIN}

EOF

done

cat <<EOF >> "$OUTPUT_FILE"
/
  Basic-Auth: ${PREVIEW_LOGIN}

EOF
