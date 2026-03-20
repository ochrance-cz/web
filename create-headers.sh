#!/usr/bin/env bash

cat <<EOF > static-preview/_headers
/admin/*
  Basic-Auth:

/*
  Basic-Auth: ${PREVIEW_LOGIN}
EOF
