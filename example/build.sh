#!/usr/bin/env bash
# Build the web extension distribution from the source code.
#
# Specifically, this will create the directory: "distribution/". The contents of this directory are ready to be loaded into
# a Chromium browser (Chrome and Opera should work) as a web extension! See the README for instructions.

set -eu

# Bash trick to get the directory containing the script. See https://stackoverflow.com/a/246128
project_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

preconditions() {
  if ! which deno &> /dev/null; then
    echo >&2 "The 'deno' command was not found. Please install Deno. See https://deno.land/."
    exit 1
  fi
}

# Delegate to the "deno bundle ..." command
deno_bundle() {
  deno bundle --quiet --config deno.jsonc "${@}"
}

build_distribution() {
  local source_dir="$project_dir/src"
  local output_dir="$project_dir/distribution"

  # Delete the build directory and everything inside of it if it already exists and then create it again.
  mkdir -p "$output_dir"
  rm -rf "$output_dir"
  mkdir -p "$output_dir" "$output_dir/rpc-framework"

  # Copy over non-TypeScript files
  cp "$source_dir/manifest.json" "$output_dir"
  cp "$source_dir/dcl-popup.html" "$output_dir"

  # Compile ("bundle") the TypeScript entrypoint-type files into JavaScript
  deno_bundle "$source_dir/dcl-init.ts" "$output_dir/dcl-init.js"
  deno_bundle "$source_dir/dcl-popup-script.ts" "$output_dir/dcl-popup-script.js"
  deno_bundle "$source_dir/dcl-content-script.ts" "$output_dir/dcl-content-script.js"
  deno_bundle "$source_dir/dcl-page-script.ts" "$output_dir/dcl-page-script.js"
  deno_bundle "$project_dir/../rpc-framework/rpc-content-script.ts" "$output_dir/rpc-framework/rpc-content-script.js"
}

preconditions

if build_distribution; then
  echo "Distribution built! ✅"
else
  echo >&2 "Build failed ❌"
fi


