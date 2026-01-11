#!/usr/bin/env bash
# Start the Node backend on Linux/macOS
# Usage:
#   ./start-node-backend.sh [--background] [--port 7000] [--env .env] [--host 0.0.0.0] [--key path] [--cert path] [--domain example.com] [--cert-dir /var/WisdomLink-main/ssh]
# Examples:
#   ./start-node-backend.sh
#   ./start-node-backend.sh --port 8080
#   ./start-node-backend.sh --background --env .env

set -euo pipefail

# --- parse args ---
BACKGROUND=0
PORT="7000"
ENV_FILE=""
HOST_ARG="0.0.0.0"
CLI_KEY=""
CLI_CERT=""
TLS_DOMAIN_ARG="${TLS_DOMAIN:-}"
CERT_DIR_ARG="${TLS_CERT_DIR:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --background|--bg)
      BACKGROUND=1; shift ;;
    --port)
      PORT="${2:-7000}"; shift 2 ;;
    --env)
      ENV_FILE="${2:-}"; shift 2 ;;
    --host)
      HOST_ARG="${2:-0.0.0.0}"; shift 2 ;;
    --key)
      CLI_KEY="${2:-}"; shift 2 ;;
    --cert)
      CLI_CERT="${2:-}"; shift 2 ;;
    --domain)
      TLS_DOMAIN_ARG="${2:-}"; shift 2 ;;
    --cert-dir)
      CERT_DIR_ARG="${2:-}"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--background] [--port 7000] [--env .env] [--host 0.0.0.0] [--key path] [--cert path] [--domain example.com] [--cert-dir /path/to/dir]"; exit 0 ;;
    *)
      echo "[WARN] Unknown argument: $1"; shift ;;
  esac
done

# --- resolve paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
LOG_DIR="${REPO_ROOT}/data/logs"
mkdir -p "${LOG_DIR}"

# --- load env file if provided ---
if [[ -n "${ENV_FILE}" ]]; then
  if [[ -f "${ENV_FILE}" ]]; then
    echo "[ENV] Loading: ${ENV_FILE}"
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
  else
    echo "[WARN] Env file not found: ${ENV_FILE}"
  fi
fi

# --- sanity checks ---
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed or not in PATH." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm is not installed or not in PATH." >&2
  exit 1
fi

# Optional: warn if AI_API_KEY not set (Node backend can fallback to backend/config.py)
if [[ -z "${AI_API_KEY:-}" && -z "${OPENAI_API_KEY:-}" ]]; then
  echo "[INFO] AI_API_KEY/OPENAI_API_KEY not set. Backend will try to read backend/config.py."
fi

# --- install dependencies ---
cd "${BACKEND_DIR}"
echo "[INFO] Working dir: $(pwd)"
if [[ -f package-lock.json ]]; then
  echo "[NPM] Installing dependencies via npm ci..."
  npm ci
else
  echo "[NPM] Installing dependencies via npm install..."
  npm install
fi

# --- try to free the port (best effort) ---
if command -v lsof >/dev/null 2>&1; then
  PID_LIST=$(lsof -ti tcp:"${PORT}" || true)
  if [[ -n "${PID_LIST}" ]]; then
    echo "[PORT] Killing processes on port ${PORT}: ${PID_LIST}"
    kill -9 ${PID_LIST} || true
  fi
elif command -v fuser >/dev/null 2>&1; then
  echo "[PORT] Freeing port ${PORT} via fuser (best effort)"
  fuser -k "${PORT}/tcp" || true
else
  echo "[PORT] Skipped freeing port ${PORT} (lsof/fuser not found)"
fi

# --- detect TLS certs under ~/.ssh and export env ---
export PORT
export HOST="${HOST_ARG}"
export TLS_DOMAIN="${TLS_DOMAIN_ARG}"
export TLS_CERT_DIR="${CERT_DIR_ARG}"

SSH_DIR="/var/WisdomLink-main/ssh"
TLS_KEY_PATH_ENV="${TLS_KEY_PATH:-}"
TLS_CERT_PATH_ENV="${TLS_CERT_PATH:-}"

pick_tls_pair_in_dir() {
  local dir="$1"
  local key_path="" cert_path=""
  # Priority 1: privkey*.pem + fullchain*.pem (Let's Encrypt-like copies)
  if compgen -G "${dir}/privkey*.pem" > /dev/null && compgen -G "${dir}/fullchain*.pem" > /dev/null; then
    key_path="$(ls -1 ${dir}/privkey*.pem | head -n1)"; cert_path="$(ls -1 ${dir}/fullchain*.pem | head -n1)"
    echo "${key_path}|${cert_path}"; return 0
  fi
  # Priority 2: server.key + server.crt
  if [[ -f "${dir}/server.key" && -f "${dir}/server.crt" ]]; then
    echo "${dir}/server.key|${dir}/server.crt"; return 0
  fi
  # Priority 3: key.pem + cert.pem
  if [[ -f "${dir}/key.pem" && -f "${dir}/cert.pem" ]]; then
    echo "${dir}/key.pem|${dir}/cert.pem"; return 0
  fi
  # Priority 4: match any *.key with same basename *.crt or *.pem
  if compgen -G "${dir}/*.key" > /dev/null; then
    for k in "${dir}"/*.key; do
      [[ -f "$k" ]] || continue
      base="${k%.key}"
      if [[ -f "${base}.crt" ]]; then echo "${k}|${base}.crt"; return 0; fi
      if [[ -f "${base}.pem" ]]; then echo "${k}|${base}.pem"; return 0; fi
    done
  fi
  # Priority 5: heuristic pairing - pick one key candidate and one cert candidate even if basenames differ
  # Keys: *.key, privkey*.pem, key.pem
  # Certs: *.crt, fullchain*.pem, cert*.pem
  local key_candidates=()
  local cert_candidates=()
  if compgen -G "${dir}/*.key" > /dev/null; then key_candidates+=( $(ls -1 ${dir}/*.key 2>/dev/null) ); fi
  if compgen -G "${dir}/privkey*.pem" > /dev/null; then key_candidates+=( $(ls -1 ${dir}/privkey*.pem 2>/dev/null) ); fi
  if [[ -f "${dir}/key.pem" ]]; then key_candidates+=( "${dir}/key.pem" ); fi
  if compgen -G "${dir}/*.crt" > /dev/null; then cert_candidates+=( $(ls -1 ${dir}/*.crt 2>/dev/null) ); fi
  if compgen -G "${dir}/fullchain*.pem" > /dev/null; then cert_candidates+=( $(ls -1 ${dir}/fullchain*.pem 2>/dev/null) ); fi
  if compgen -G "${dir}/cert*.pem" > /dev/null; then cert_candidates+=( $(ls -1 ${dir}/cert*.pem 2>/dev/null) ); fi
  if [[ ${#key_candidates[@]} -ge 1 && ${#cert_candidates[@]} -ge 1 ]]; then
    echo "${key_candidates[0]}|${cert_candidates[0]}"; return 0
  fi
  echo "|"; return 1
}

# TLS selection precedence:
# 1) CLI --key/--cert if both provided
# 2) Env TLS_KEY_PATH/TLS_CERT_PATH if both provided
# 3) --cert-dir / TLS_CERT_DIR 指定目录
# 4) Repo ssh/certs: ${REPO_ROOT}/ssh 或 ${BACKEND_DIR}/ssh，或 ${REPO_ROOT}/certs / ${BACKEND_DIR}/certs (privkey/fullchain 或 *.key+*.crt/pem)
# 5) ~/.ssh 常见命名或 *.key+*.crt/pem 配对
# 6) /etc/letsencrypt/live/*/ (privkey.pem + fullchain.pem) 或 /etc/letsencrypt/live/$TLS_DOMAIN

if [[ -n "${CLI_KEY}" && -n "${CLI_CERT}" ]]; then
  export TLS_KEY_PATH="${CLI_KEY}"
  export TLS_CERT_PATH="${CLI_CERT}"
  echo "[TLS] Using certs from CLI -> key=${TLS_KEY_PATH}, cert=${TLS_CERT_PATH}"
elif [[ -n "${TLS_KEY_PATH_ENV}" && -n "${TLS_CERT_PATH_ENV}" ]]; then
  export TLS_KEY_PATH="${TLS_KEY_PATH_ENV}"
  export TLS_CERT_PATH="${TLS_CERT_PATH_ENV}"
  echo "[TLS] Using certs from env -> key=${TLS_KEY_PATH}, cert=${TLS_CERT_PATH}"
else
  FOUND_PAIR="|"
  # 3) 指定证书目录（强制优先）
  if [[ -n "${CERT_DIR_ARG}" && -d "${CERT_DIR_ARG}" ]]; then
    FOUND_PAIR=$(pick_tls_pair_in_dir "${CERT_DIR_ARG}") || true
  fi
  # 4) repo-level ssh/certs (prefer项目内ssh或certs)
  if [[ "${FOUND_PAIR}" == "|" ]]; then
    for D in "${REPO_ROOT}/ssh" "${BACKEND_DIR}/ssh" "${REPO_ROOT}/certs" "${BACKEND_DIR}/certs"; do
    if [[ -d "$D" ]]; then
      FOUND_PAIR=$(pick_tls_pair_in_dir "$D") || true
      if [[ "${FOUND_PAIR}" != "|" ]]; then break; fi
    fi
    done
  fi
  # 4) ~/.ssh
  if [[ "${FOUND_PAIR}" == "|" && -d "${SSH_DIR}" ]]; then
    FOUND_PAIR=$(pick_tls_pair_in_dir "${SSH_DIR}") || true
  fi
  KEY_CAND="${FOUND_PAIR%%|*}"
  CERT_CAND="${FOUND_PAIR##*|}"
  if [[ -z "${KEY_CAND}" || -z "${CERT_CAND}" ]]; then
    # 5) Try Let's Encrypt default path
    if [[ -d "/etc/letsencrypt/live" ]]; then
      if [[ -n "${TLS_DOMAIN}" && -d "/etc/letsencrypt/live/${TLS_DOMAIN}" ]]; then
        LIVE_DIR="${TLS_DOMAIN}"
      else
        LIVE_DIR=$(ls -1 /etc/letsencrypt/live 2>/dev/null | head -n1 || true)
      fi
      if [[ -n "${LIVE_DIR}" && -f "/etc/letsencrypt/live/${LIVE_DIR}/privkey.pem" && -f "/etc/letsencrypt/live/${LIVE_DIR}/fullchain.pem" ]]; then
        KEY_CAND="/etc/letsencrypt/live/${LIVE_DIR}/privkey.pem"
        CERT_CAND="/etc/letsencrypt/live/${LIVE_DIR}/fullchain.pem"
      fi
    fi
  fi
  if [[ -n "${KEY_CAND}" && -n "${CERT_CAND}" ]]; then
    # Prefer relative paths if files are inside repo, so Node prints relative paths
    REL_KEY="${KEY_CAND}"; REL_CERT="${CERT_CAND}"; REL_SUFFIX=""
    if [[ "${KEY_CAND}" == ${BACKEND_DIR}/* ]]; then
      REL_KEY="${KEY_CAND#${BACKEND_DIR}/}"; REL_SUFFIX=" (relative)"
    elif [[ "${KEY_CAND}" == ${REPO_ROOT}/* ]]; then
      REL_KEY="../${KEY_CAND#${REPO_ROOT}/}"; REL_SUFFIX=" (relative)"
    fi
    if [[ "${CERT_CAND}" == ${BACKEND_DIR}/* ]]; then
      REL_CERT="${CERT_CAND#${BACKEND_DIR}/}"; REL_SUFFIX=" (relative)"
    elif [[ "${CERT_CAND}" == ${REPO_ROOT}/* ]]; then
      REL_CERT="../${CERT_CAND#${REPO_ROOT}/}"; REL_SUFFIX=" (relative)"
    fi
    export TLS_KEY_PATH="${REL_KEY}"
    export TLS_CERT_PATH="${REL_CERT}"
    echo "[TLS] Using certs -> key=${TLS_KEY_PATH}${REL_SUFFIX}, cert=${TLS_CERT_PATH}${REL_SUFFIX}"
  else
    echo "[TLS] No usable cert pair found (checked ~/.ssh and /etc/letsencrypt/live). Falling back to HTTP."
  fi
fi

# --- run server ---
CMD=(node node-server.js)

if [[ ${BACKGROUND} -eq 1 ]]; then
  TS="$(date +%F_%H%M%S)"
  LOG_FILE="${LOG_DIR}/node-backend-${TS}.log"
  echo "[RUN] Starting backend in background on port ${PORT}..."
  echo "[RUN] Logs: ${LOG_FILE}"
  nohup "${CMD[@]}" >"${LOG_FILE}" 2>&1 &
  echo $! > "${BACKEND_DIR}/backend.pid"
  echo "[OK] PID $(cat "${BACKEND_DIR}/backend.pid")"
  echo "[HINT] To stop: kill \"$(cat "${BACKEND_DIR}/backend.pid")\""
else
  echo "[RUN] Starting backend in foreground on port ${PORT}..."
  echo "[HINT] Press Ctrl+C to stop."
  exec "${CMD[@]}"
fi
