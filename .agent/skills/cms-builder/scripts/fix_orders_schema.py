#!/usr/bin/env python3
"""
Fix Orders Collection Schema
- Remove UNIQUE constraint from stripe_session_id and stripe_payment_intent
- Add missing 'items' (JSON) and 'amount_tax' (Number) fields
- Add missing 'placed_at' (AutoDate) field for reliable order date display
- Add missing 'placed_at_override' (Date) field for backfilling/fixing old orders
"""

import requests
import json
import sys
import os
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def load_env():
    """Load .env from project root"""
    env_path = os.path.join(os.path.dirname(__file__), "../../../../.env")
    try:
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()
    except FileNotFoundError:
        print(f"⚠️ Warning: .env not found at {env_path}")


def get_creds():
    url = os.environ.get("PUBLIC_POCKETBASE_URL") or os.environ.get(
        "POCKETBASE_URL", "http://127.0.0.1:8090"
    )
    email = os.environ.get("POCKETBASE_ADMIN_EMAIL") or os.environ.get("PB_ADMIN_EMAIL")
    password = os.environ.get("POCKETBASE_ADMIN_PASSWORD") or os.environ.get(
        "PB_ADMIN_PASSWORD"
    )

    if not email or not password:
        print("❌ Error: Admin credentials not found in .env")
        sys.exit(1)

    return url, email, password


def fix_orders_schema():
    load_env()
    base_url, email, password = get_creds()

    print(f"🚀 Connecting to PocketBase at {base_url}...")

    # Authenticate
    auth_url = f"{base_url.rstrip('/')}/api/collections/_superusers/auth-with-password"
    try:
        resp = requests.post(
            auth_url,
            json={"identity": email, "password": password},
            verify=False,
            timeout=30,
        )
        resp.raise_for_status()
        token = resp.json()["token"]
        print("✅ Authentication successful.")
    except Exception as e:
        print(f"❌ Auth failed: {e}")
        return False

    headers = {"Authorization": f"{token}", "Content-Type": "application/json"}

    # Get orders collection
    print("📥 Fetching orders collection...")
    get_url = f"{base_url.rstrip('/')}/api/collections/orders"
    resp = requests.get(get_url, headers=headers, verify=False, timeout=30)
    if resp.status_code != 200:
        print(f"❌ Failed to fetch orders collection: {resp.text}")
        return False

    orders_col = resp.json()
    print(f"📋 Current fields: {[f['name'] for f in orders_col['fields']]}")

    # Check if items field exists
    has_items = any(f["name"] == "items" for f in orders_col["fields"])
    has_amount_tax = any(f["name"] == "amount_tax" for f in orders_col["fields"])
    has_placed_at = any(f["name"] == "placed_at" for f in orders_col["fields"])
    has_placed_at_override = any(
        f["name"] == "placed_at_override" for f in orders_col["fields"]
    )

    # Prepare updates
    new_fields = list(orders_col["fields"])

    if not has_items:
        print("➕ Adding 'items' JSON field...")
        new_fields.append(
            {
                "name": "items",
                "type": "json",
                "required": False,
                "presentable": False,
                "hidden": False,
                "maxSize": 0,
                "system": False,
            }
        )
    else:
        print("✓ 'items' field already exists")

    if not has_amount_tax:
        print("➕ Adding 'amount_tax' Number field...")
        new_fields.append(
            {
                "name": "amount_tax",
                "type": "number",
                "required": False,
                "presentable": False,
                "hidden": False,
                "onlyInt": False,
                "min": None,
                "max": None,
                "system": False,
            }
        )
    else:
        print("✓ 'amount_tax' field already exists")

    if not has_placed_at:
        print("➕ Adding 'placed_at' AutoDate field...")
        new_fields.append(
            {
                "name": "placed_at",
                "type": "autodate",
                "required": False,
                "presentable": False,
                "hidden": False,
                "onCreate": True,
                "onUpdate": False,
                "system": False,
            }
        )
    else:
        print("✓ 'placed_at' field already exists")

    if not has_placed_at_override:
        print("➕ Adding 'placed_at_override' Date field...")
        new_fields.append(
            {
                "name": "placed_at_override",
                "type": "date",
                "required": False,
                "presentable": False,
                "hidden": False,
                "min": None,
                "max": None,
                "system": False,
            }
        )
    else:
        print("✓ 'placed_at_override' field already exists")

    # Fix indexes - remove UNIQUE constraint
    current_indexes = orders_col.get("indexes", [])
    new_indexes = []

    for idx in current_indexes:
        if "UNIQUE" in idx and (
            "stripe_session_id" in idx or "stripe_payment_intent" in idx
        ):
            print(f"🗑️  Removing UNIQUE constraint: {idx}")
            # Convert to non-unique index
            new_idx = idx.replace("UNIQUE INDEX", "INDEX")
            new_indexes.append(new_idx)
        else:
            new_indexes.append(idx)

    # Apply update
    update_payload = {"fields": new_fields, "indexes": new_indexes}

    print(f"\n📤 Updating orders collection...")
    update_url = f"{base_url.rstrip('/')}/api/collections/orders"
    resp = requests.patch(
        update_url, headers=headers, json=update_payload, verify=False, timeout=30
    )

    if resp.status_code == 200:
        print("✅ Orders collection updated successfully!")
        print(f"   New fields: {[f['name'] for f in resp.json()['fields']]}")
        return True
    else:
        print(f"❌ Update failed: {resp.status_code}")
        print(f"   Response: {resp.text}")
        return False


if __name__ == "__main__":
    success = fix_orders_schema()
    sys.exit(0 if success else 1)
