#!/bin/bash
export NEXT_TYPESCRIPT_BUILD_ERRORS=1
export NEXT_LINT_BUILD_ERRORS=1
pnpm next build --no-lint
