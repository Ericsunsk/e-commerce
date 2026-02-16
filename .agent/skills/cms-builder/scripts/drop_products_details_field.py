#!/usr/bin/env python3
"""Drop the redundant products.details field.

We currently use products.attributes.details in the frontend, and products.details is unused.

Safety:
- Creates no data migration; run only after confirming products.details is empty.
"""

import os
import sys
from pathlib import Path

import requests
import urllib3


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def load_env() -> None:
    env_path = Path(__file__).resolve().parents[4] / ".env"
    if not env_path.exists():
        print(f"WARN: .env not found at {env_path}")
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def get_pb_creds():
    url = os.environ.get("PUBLIC_POCKETBASE_URL") or os.environ.get("POCKETBASE_URL")
    email = os.environ.get("POCKETBASE_ADMIN_EMAIL") or os.environ.get("PB_ADMIN_EMAIL")
    password = os.environ.get("POCKETBASE_ADMIN_PASSWORD") or os.environ.get(
        "PB_ADMIN_PASSWORD"
    )
    if not url or not email or not password:
        raise SystemExit(
            "ERROR: Missing PUBLIC_POCKETBASE_URL and/or PocketBase admin creds in .env"
        )
    return url.rstrip("/"), email, password


def auth_token(base_url: str, email: str, password: str) -> str:
    r = requests.post(
        f"{base_url}/api/collections/_superusers/auth-with-password",
        json={"identity": email, "password": password},
        timeout=30,
    )
    r.raise_for_status()
    token = r.json().get("token")
    if not token:
        raise RuntimeError("PocketBase auth succeeded but token missing")
    return token


def main() -> int:
    load_env()
    base_url, email, password = get_pb_creds()
    token = auth_token(base_url, email, password)
    headers = {"Authorization": token, "Content-Type": "application/json"}

    col = requests.get(
        f"{base_url}/api/collections/products",
        headers={"Authorization": token},
        timeout=30,
    )
    col.raise_for_status()
    colj = col.json()
    fields = list(colj.get("fields") or [])

    kept = []
    removed = 0
    for f in fields:
        if isinstance(f, dict) and f.get("name") == "details":
            removed += 1
            continue
        kept.append(f)

    if removed == 0:
        print("No-op: products.details field not present")
        return 0

    resp = requests.patch(
        f"{base_url}/api/collections/products",
        headers=headers,
        json={"fields": kept},
        timeout=60,
    )
    if resp.status_code >= 400:
        print(f"ERROR: Failed to patch products: {resp.status_code} {resp.text}")
        return 1

    print("OK: dropped products.details")
    return 0


if __name__ == "__main__":
    sys.exit(main())
