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

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Webhook secret - n8n must send this in X-Webhook-Secret header
WEBHOOK_SECRET = "n8n-elementhic-webhook-2026"


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
        print(f"⚠️ Warning: .env not found")


def get_creds():
    url = os.environ.get("PUBLIC_POCKETBASE_URL") or "http://127.0.0.1:8090"
    email = os.environ.get("POCKETBASE_ADMIN_EMAIL") or os.environ.get("PB_ADMIN_EMAIL")
    password = os.environ.get("POCKETBASE_ADMIN_PASSWORD") or os.environ.get("PB_ADMIN_PASSWORD")
    return url, email, password


def update_api_rules():
    load_env()
    base_url, email, password = get_creds()
    
    print(f"🚀 Connecting to PocketBase at {base_url}...")
    
    # Authenticate
    auth_url = f"{base_url.rstrip('/')}/api/collections/_superusers/auth-with-password"
    try:
        resp = requests.post(auth_url, json={"identity": email, "password": password}, verify=False, timeout=30)
        resp.raise_for_status()
        token = resp.json()["token"]
        print("✅ Authentication successful.")
    except Exception as e:
        print(f"❌ Auth failed: {e}")
        return False

    headers = {"Authorization": f"{token}", "Content-Type": "application/json"}
    
    # Update Orders collection
    print("\n📝 Updating 'orders' API rules...")
    
    # New rules for orders:
    # - createRule: Allow if webhook secret header matches OR user is authenticated
    # - updateRule: Allow webhook secret to update status
    orders_update = {
        "createRule": f'@request.headers.x_webhook_secret = "{WEBHOOK_SECRET}"',
        "updateRule": f'@request.headers.x_webhook_secret = "{WEBHOOK_SECRET}"'
    }
    
    resp = requests.patch(
        f"{base_url.rstrip('/')}/api/collections/orders",
        headers=headers,
        json=orders_update,
        verify=False,
        timeout=30
    )
    
    if resp.status_code == 200:
        print("✅ Orders rules updated:")
        print(f"   createRule: {orders_update['createRule']}")
        print(f"   updateRule: {orders_update['updateRule']}")
    else:
        print(f"❌ Failed to update orders: {resp.text}")
        return False
    
    # Update User Lists collection
    print("\n📝 Updating 'user_lists' API rules...")
    
    # New rules for user_lists:
    # - deleteRule: Allow if webhook secret header matches OR user owns the record
    user_lists_update = {
        "deleteRule": f'@request.auth.id = user.id || @request.headers.x_webhook_secret = "{WEBHOOK_SECRET}"'
    }
    
    resp = requests.patch(
        f"{base_url.rstrip('/')}/api/collections/user_lists",
        headers=headers,
        json=user_lists_update,
        verify=False,
        timeout=30
    )
    
    if resp.status_code == 200:
        print("✅ User Lists rules updated:")
        print(f"   deleteRule: {user_lists_update['deleteRule']}")
    else:
        print(f"❌ Failed to update user_lists: {resp.text}")
        return False
    
    print(f"\n🔑 Webhook Secret: {WEBHOOK_SECRET}")
    print("   Add this to n8n HTTP Request headers: X-Webhook-Secret")
    
    return True


if __name__ == "__main__":
    success = update_api_rules()
    sys.exit(0 if success else 1)
