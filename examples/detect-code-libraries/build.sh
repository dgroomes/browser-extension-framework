#!/usr/bin/env bash
# Build the "Detect Code Libraries" (DCL) web extension distribution from the source code.
#
# Specifically, this will create the directories: "dist/chromium-manifest-v2" and "firefox-manifest-v2. The
# contents of these directories are ready to be loaded into a Chromium browser (Chrome and Opera should work) or Firefox
# as a web extension! See the README for instructions.

set -eu

# Bash trick to get the directory containing the script. See https://stackoverflow.com/a/246128
project_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
bef_dist="$project_dir/../../framework/dist/"

preconditions() {
  if [[ ! -d "$bef_dist" ]]; then
    echo >&2 "The BrowserExtensionFramework distribution was not found in '$bef_dist'. Build BrowserExtensionFramework by following the instructions in its README"
    exit 1
  fi
}

build_source() {
  pushd "$project_dir"
  npm run build
  popd
}

assemble_distribution() {
  local vendor_dir_name="$1"
  local output_dir="$project_dir/dist/${vendor_dir_name}"

  # Delete the build directory and everything inside of it if it already exists and then create it again.
  mkdir -p "$output_dir"
  rm -rf "$output_dir"
  mkdir -p "$output_dir"

  # Copy over the non-JavaScript files
  cp "$project_dir/src/$vendor_dir_name/manifest.json" "$output_dir"
  cp "$project_dir/src/dcl-popup.html" "$output_dir"

  # Copy over the entrypoint JavaScript files
  cp "$project_dir/dist/dcl-popup-script.js" "$output_dir"
  cp "$project_dir/dist/dcl-page-script.js" "$output_dir"
  cp "$bef_dist/content-script-middleware.js" "$output_dir"
}

build_all() {
    echo "Building..."

    build_source

    assemble_distribution "chromium-manifest-v2"
    echo "Chromium distribution built! ✅"
    assemble_distribution "firefox-manifest-v2"
    echo "Firefox distribution built! ✅"
}

preconditions

build_all
