#!/usr/bin/env bash
__qa_env_prev_opts="$(set +o)"
trap 'eval "$__qa_env_prev_opts"; unset __qa_env_prev_opts; trap - RETURN' RETURN
set -euo pipefail

env_file="${QA_ENV_FILE:-.env.qa}"

if [[ ! -f "$env_file" ]]; then
  echo "QA env loader failed: $env_file not found." >&2
  return 1 2>/dev/null || exit 1
fi

names=()
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  if [[ -z "$line" || "$line" == \#* ]]; then
    continue
  fi

  if [[ "$line" != *"="* ]]; then
    continue
  fi

  name="${line%%=*}"
  value="${line#*=}"
  export "$name=$value"
  names+=("$name")
done < "$env_file"

for name in "${names[@]}"; do
  echo "Set $name"
done
