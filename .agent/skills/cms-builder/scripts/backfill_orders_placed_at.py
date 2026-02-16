#!/usr/bin/env python3
"""Backfill orders.placed_at_override from Stripe.

Why:
- This PocketBase instance does not expose base system fields (created/updated) for business collections.
- Order history UI needs a reliable timestamp.

Strategy:
1) Find orders where placed_at_override is empty string.
2) Prefer Stripe Checkout Session created timestamp (stripe_session_id).
3) Fallback to Stripe PaymentIntent created timestamp (stripe_payment_intent).
4) PATCH PocketBase order record with placed_at_override = ISO-8601 UTC string.

Usage:
  python3 backfill_orders_placed_at.py
  python3 backfill_orders_placed_at.py --apply
"""

import argparse
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests
import urllib3


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def load_env() -> None:
    # Load .env from project root (four levels up from scripts dir)
    env_path = os.path.join(os.path.dirname(__file__), "../../../../.env")
    try:
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())
    except FileNotFoundError:
        print(f"WARN: .env not found at {env_path}")


def get_pb_creds() -> Tuple[str, str, str]:
    url = (
        os.environ.get("PUBLIC_POCKETBASE_URL")
        or os.environ.get("POCKETBASE_URL")
        or "http://127.0.0.1:8090"
    )
    email = os.environ.get("POCKETBASE_ADMIN_EMAIL") or os.environ.get("PB_ADMIN_EMAIL")
    password = os.environ.get("POCKETBASE_ADMIN_PASSWORD") or os.environ.get(
        "PB_ADMIN_PASSWORD"
    )
    if not email or not password:
        print(
            "ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env"
        )
        sys.exit(1)
    return url.rstrip("/"), email, password


def get_stripe_secret() -> str:
    key = os.environ.get("STRIPE_SECRET_KEY")
    if not key:
        print("ERROR: STRIPE_SECRET_KEY must be set in .env")
        sys.exit(1)
    return key


def pb_auth_token(base_url: str, email: str, password: str) -> str:
    auth_url = f"{base_url}/api/collections/_superusers/auth-with-password"
    resp = requests.post(
        auth_url,
        json={"identity": email, "password": password},
        verify=False,
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("token")
    if not token:
        raise RuntimeError("PocketBase auth succeeded but token missing")
    return token


def iso_utc_from_unix(ts: int) -> str:
    # Use RFC3339 / ISO-8601 UTC format.
    return (
        datetime.fromtimestamp(ts, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    )


def stripe_get_created(stripe_secret: str, obj_type: str, obj_id: str) -> Optional[int]:
    if not obj_id:
        return None

    if obj_type == "checkout_session":
        url = f"https://api.stripe.com/v1/checkout/sessions/{obj_id}"
    elif obj_type == "payment_intent":
        url = f"https://api.stripe.com/v1/payment_intents/{obj_id}"
    else:
        raise ValueError(f"Unknown Stripe obj_type: {obj_type}")

    resp = requests.get(url, auth=(stripe_secret, ""), timeout=30)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    data = resp.json()
    created = data.get("created")
    return int(created) if isinstance(created, int) else None


def pb_list_orders_missing_placed_at(
    base_url: str, token: str, per_page: int, page: int
) -> Tuple[List[Dict[str, Any]], int]:
    url = f"{base_url}/api/collections/orders/records"
    params = {"perPage": per_page, "page": page, "filter": 'placed_at_override = ""'}
    resp = requests.get(
        url, headers={"Authorization": token}, params=params, timeout=30
    )
    resp.raise_for_status()
    data = resp.json()
    items = data.get("items") or []
    total_pages = int(data.get("totalPages") or 1)
    return items, total_pages


def pb_patch_order_placed_at(
    base_url: str, token: str, order_id: str, placed_at: str
) -> bool:
    url = f"{base_url}/api/collections/orders/records/{order_id}"
    resp = requests.patch(
        url,
        headers={"Authorization": token, "Content-Type": "application/json"},
        json={"placed_at_override": placed_at},
        timeout=30,
    )
    if resp.status_code == 404:
        return False
    resp.raise_for_status()
    return True


def mask(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 10:
        return value
    return f"{value[:6]}...{value[-4:]}"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill orders.placed_at_override from Stripe"
    )
    parser.add_argument(
        "--apply", action="store_true", help="Actually write updates to PocketBase"
    )
    parser.add_argument("--per-page", type=int, default=50, help="PocketBase page size")
    parser.add_argument(
        "--max", type=int, default=0, help="Max orders to process (0 = no limit)"
    )
    parser.add_argument(
        "--sleep", type=float, default=0.1, help="Sleep seconds between Stripe requests"
    )
    args = parser.parse_args()

    load_env()
    base_url, email, password = get_pb_creds()
    stripe_secret = get_stripe_secret()

    print(f"PocketBase: {base_url}")
    print("Authenticating as superuser...")
    token = pb_auth_token(base_url, email, password)
    print("Auth OK")

    processed = 0
    updated = 0
    skipped = 0
    errors = 0

    page = 1
    total_pages = 1
    while page <= total_pages:
        items, total_pages = pb_list_orders_missing_placed_at(
            base_url, token, args.per_page, page
        )
        if not items:
            break

        for order in items:
            if args.max and processed >= args.max:
                print(f"Reached --max {args.max}; stopping.")
                page = total_pages + 1
                break

            order_id = str(order.get("id") or "")
            cs_id = str(order.get("stripe_session_id") or "")
            pi_id = str(order.get("stripe_payment_intent") or "")

            processed += 1
            created_ts: Optional[int] = None
            source = ""

            try:
                if cs_id:
                    created_ts = stripe_get_created(
                        stripe_secret, "checkout_session", cs_id
                    )
                    source = f"checkout_session:{mask(cs_id)}"
                if created_ts is None and pi_id:
                    created_ts = stripe_get_created(
                        stripe_secret, "payment_intent", pi_id
                    )
                    source = f"payment_intent:{mask(pi_id)}"
            except Exception as e:
                errors += 1
                print(
                    f"WARN Stripe lookup failed for order {mask(order_id)} ({source}): {type(e).__name__}"
                )
                continue

            if created_ts is None:
                skipped += 1
                print(
                    f"SKIP order {mask(order_id)} (no Stripe timestamp; cs={bool(cs_id)} pi={bool(pi_id)})"
                )
                continue

            placed_at = iso_utc_from_unix(created_ts)

            if not args.apply:
                print(
                    f"DRY  order {mask(order_id)}  placed_at_override={placed_at}  src={source}"
                )
                continue

            try:
                ok = pb_patch_order_placed_at(base_url, token, order_id, placed_at)
                if ok:
                    updated += 1
                    print(
                        f"OK   order {mask(order_id)}  placed_at_override={placed_at}  src={source}"
                    )
                else:
                    errors += 1
                    print(f"WARN PocketBase order not found: {mask(order_id)}")
            except Exception as e:
                errors += 1
                print(
                    f"WARN PocketBase update failed for order {mask(order_id)}: {type(e).__name__}"
                )
                continue

            if args.sleep:
                time.sleep(args.sleep)

        page += 1

    mode = "APPLY" if args.apply else "DRY-RUN"
    print(
        f"\nDone ({mode}). processed={processed} updated={updated} skipped={skipped} errors={errors}"
    )
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
