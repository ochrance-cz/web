#!/usr/bin/env bash

cat <<EOF > static-preview/_headers
/*
  Basic-Auth: ${PREVIEW_LOGIN}
EOF
