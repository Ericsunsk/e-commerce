#!/usr/bin/env python3
"""
Update Orders and User Lists API Rules for n8n webhook access
Uses a secret header for authentication instead of admin password
"""

import requests
import json
import sys
import os
import urllib3
from typing import Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

REDACTED_WEBHOOK_SECRET = "__WEBHOOK_SECRET__"


def load_env():
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
        print("WARN: .env not found")


def get_webhook_secret():
    secret = os.environ.get("WEBHOOK_SECRET") or os.environ.get("PB_WEBHOOK_SECRET")
    if not secret:
        return None
    return secret


def get_orders_secret_expr(base_url: str, headers: dict) -> Optional[str]:
    """Derive webhook rule expression from the existing 'orders' collection.

    This avoids needing to expose/store WEBHOOK_SECRET locally.
    """
    try:
        resp = requests.get(
            f"{base_url.rstrip('/')}/api/collections/orders",
            headers=headers,
            verify=False,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        rule = data.get("updateRule") or data.get("createRule")
        if isinstance(rule, str) and rule.strip():
            return rule
    except Exception as e:
        print(f"ERROR: Failed to derive orders rule expression: {e}")
    return None


def get_creds():
    url = os.environ.get("PUBLIC_POCKETBASE_URL") or "http://127.0.0.1:8090"
    email = os.environ.get("POCKETBASE_ADMIN_EMAIL") or os.environ.get("PB_ADMIN_EMAIL")
    password = os.environ.get("POCKETBASE_ADMIN_PASSWORD") or os.environ.get(
        "PB_ADMIN_PASSWORD"
    )
    return url, email, password


def update_api_rules():
    load_env()
    base_url, email, password = get_creds()

    print(f"Connecting to PocketBase at {base_url}...")

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
        print("Auth OK")
    except Exception as e:
        print(f"ERROR: Auth failed: {e}")
        return False

    headers = {"Authorization": f"{token}", "Content-Type": "application/json"}

    webhook_secret = get_webhook_secret()

    # New rules for webhook access:
    # - Allow if webhook secret header matches OR query param matches
    if webhook_secret:
        secret_expr = (
            f'@request.headers.x_webhook_secret = "{webhook_secret}" || '
            f'@request.query.webhook_secret = "{webhook_secret}"'
        )
    else:
        print(
            "WARN: WEBHOOK_SECRET not set locally; deriving secret rule from remote 'orders' collection"
        )
        secret_expr = get_orders_secret_expr(base_url, headers)
        if not secret_expr:
            print(
                "ERROR: Could not derive webhook secret rule. Set WEBHOOK_SECRET in .env or ensure orders rules are configured."
            )
            return False

    # Update Orders collection
    print("\nUpdating 'orders' API rules...")

    # Existing default behavior:
    # - Auth users can list/view ONLY their own orders.
    # - Webhook secret can create/update/delete (used by n8n).
    #
    # n8n also needs to LIST orders to perform idempotent lookup by
    # stripe_payment_intent before creating a new record.
    user_owns_order_expr = '@request.auth.id != "" && user = @request.auth.id'
    webhook_or_user_expr = f"({user_owns_order_expr}) || ({secret_expr})"

    orders_update = {
        "listRule": webhook_or_user_expr,
        "viewRule": webhook_or_user_expr,
        "createRule": secret_expr,
        "updateRule": secret_expr,
        "deleteRule": secret_expr,
    }

    resp = requests.patch(
        f"{base_url.rstrip('/')}/api/collections/orders",
        headers=headers,
        json=orders_update,
        verify=False,
        timeout=30,
    )

    if resp.status_code == 200:
        print("OK: Orders rules updated")
    else:
        print(f"ERROR: Failed to update orders: {resp.text}")
        return False

    # Update User Lists collection
    print("\nUpdating 'user_lists' API rules...")

    # New rules for user_lists:
    # - deleteRule: Allow if webhook secret header matches OR user owns the record
    user_lists_update = {
        "updateRule": f"@request.auth.id = user.id || {secret_expr}",
        "deleteRule": f"@request.auth.id = user.id || {secret_expr}",
    }

    resp = requests.patch(
        f"{base_url.rstrip('/')}/api/collections/user_lists",
        headers=headers,
        json=user_lists_update,
        verify=False,
        timeout=30,
    )

    if resp.status_code == 200:
        print("OK: User Lists rules updated")
    else:
        print(f"ERROR: Failed to update user_lists: {resp.text}")
        return False

    # Update Product Variants collection
    print("\nUpdating 'product_variants' API rules...")

    product_variants_update = {
        "updateRule": secret_expr,
    }

    resp = requests.patch(
        f"{base_url.rstrip('/')}/api/collections/product_variants",
        headers=headers,
        json=product_variants_update,
        verify=False,
        timeout=30,
    )

    if resp.status_code == 200:
        print("OK: Product Variants rules updated")
    else:
        print(f"ERROR: Failed to update product_variants: {resp.text}")
        return False

    # Update Coupons collection
    print("\nUpdating 'coupons' API rules...")

    coupons_update = {
        "updateRule": secret_expr,
    }

    resp = requests.patch(
        f"{base_url.rstrip('/')}/api/collections/coupons",
        headers=headers,
        json=coupons_update,
        verify=False,
        timeout=30,
    )

    if resp.status_code == 200:
        print("OK: Coupons rules updated")
    else:
        print(f"ERROR: Failed to update coupons: {resp.text}")
        return False

    print("\nNOTE: Configure your n8n HTTP Request headers with X-Webhook-Secret")
    print(f"      WEBHOOK_SECRET={REDACTED_WEBHOOK_SECRET}")

    return True


if __name__ == "__main__":
    success = update_api_rules()
    sys.exit(0 if success else 1)
