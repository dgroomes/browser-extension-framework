#!/usr/bin/env bash
# Build the "Detect Code Libraries" (DCL) web extension distribution from the source code.
#
# Specifically, this will create the directories: "distribution/chromium-manifest-v2" and "firefox-manifest-v2. The
# contents of these directories are ready to be loaded into a Chromium browser (Chrome and Opera should work) or FireFox
# as a web extension! See the README for instructions.

set -eu

# Bash trick to get the directory containing the script. See https://stackoverflow.com/a/246128
project_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

preconditions() {
  if ! which deno &> /dev/null; then
    echo >&2 "The 'deno' command was not found. Please install Deno. See https://deno.land/."
    exit 1
  fi
}

build_distribution() {
  local vendor_dir_name="$1"
  local import_map="$2"

  local output_dir="$project_dir/distribution/${vendor_dir_name}"

  # Delegate to the "deno bundle ..." command
  deno_bundle() {
    deno bundle --quiet --config ../deno.json --import-map "$import_map" "${@}"
  }


  # Delete the build directory and everything inside of it if it already exists and then create it again.
  mkdir -p "$output_dir"
  rm -rf "$output_dir"
  mkdir -p "$output_dir"

  # Copy over non-TypeScript files
  cp "$project_dir/src/$vendor_dir_name/manifest.json" "$output_dir"
  cp "$project_dir/src/dcl-popup.html" "$output_dir"

  # Compile ("bundle") the TypeScript entrypoint-type files into JavaScript
  deno_bundle "$project_dir/src/dcl-popup-script.ts" "$output_dir/dcl-popup-script.js"
  deno_bundle "$project_dir/src/dcl-page-script.ts" "$output_dir/dcl-page-script.js"
  mkdir "$output_dir/rpc"
  deno_bundle "$project_dir/../content-script-middleware.ts" "$output_dir/content-script-middleware.js"
}

build_all() {
    echo "Building..."
    local build_status=0

    build_distribution "chromium-manifest-v2" "../import_map.json"
    echo "Chromium distribution built! ✅"
    build_distribution "firefox-manifest-v2" "../firefox_import_map.json"
    echo "FireFox distribution built! ✅"
}

preconditions

build_all
