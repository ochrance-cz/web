#!/usr/bin/env bash

cat <<EOF > static-preview/_headers
/admin/*
 # no headers

/*
  Basic-Auth: ${PREVIEW_LOGIN}
EOF
