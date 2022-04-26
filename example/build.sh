#!/usr/bin/env bash
# Build the "Detect Code Libraries" (DCL) web extension distribution from the source code.
#
# Specifically, this will create the directory: "distribution/chromium-manifest-v2". The contents of this directory are
# ready to be loaded into a Chromium browser (Chrome and Opera should work) as a web extension! See the README for
# instructions.

set -eu

# Bash trick to get the directory containing the script. See https://stackoverflow.com/a/246128
project_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
extension_sources=(chromium-manifest-v2 firefox-manifest-v2)

preconditions() {
  if ! which deno &> /dev/null; then
    echo >&2 "The 'deno' command was not found. Please install Deno. See https://deno.land/."
    exit 1
  fi
}

# Delegate to the "deno bundle ..." command
deno_bundle() {
  deno bundle --quiet --config ../deno.json "${@}"
}

build_distribution() {
  local extension_source="$1"
  local output_dir="$project_dir/distribution/${extension_source}"

  # Delete the build directory and everything inside of it if it already exists and then create it again.
  mkdir -p "$output_dir"
  rm -rf "$output_dir"
  mkdir -p "$output_dir"

  # Copy over non-TypeScript files
  cp "$project_dir/src/$extension_source/manifest.json" "$output_dir"
  cp "$project_dir/src/dcl-popup.html" "$output_dir"

  # Compile ("bundle") the TypeScript entrypoint-type files into JavaScript
  deno_bundle "$project_dir/src/$extension_source/dcl-init.ts" "$output_dir/dcl-init.js"
  deno_bundle "$project_dir/src/dcl-popup-script.ts" "$output_dir/dcl-popup-script.js"
  deno_bundle "$project_dir/src/dcl-content-script.ts" "$output_dir/dcl-content-script.js"
  deno_bundle "$project_dir/src/dcl-page-script.ts" "$output_dir/dcl-page-script.js"
  mkdir "$output_dir/rpc"
  deno_bundle "$project_dir/../rpc/rpc-content-script-proxy.ts" "$output_dir/rpc/rpc-content-script-proxy.js"
}

build_all() {
    echo "Building..."
    local build_status=0

    # Allow failures (set +e). It's expected that the build will often fail because as new code is written it won't
    # compile.
    set +e
    for extension_source in "${extension_sources[@]}"; do
      if ! build_distribution "$extension_source"; then
        # If the vendor-specific build failed (Chromium or FireFox) break now and don't bother building the other
        # vendor-specific distribution.
        build_status=1
        break
      fi
    done
    # Disallow failures again. If there is an exception, that's unexpected and should terminate the script.
    set -e

    if [[ $build_status = 0 ]]; then
      echo "Distributions built! ✅"
    else
      echo >&2 "Build failed ❌"
    fi
}

preconditions

build_all
