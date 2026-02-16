import requests
import json
import sys
import os
import re
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


REDACTED_WEBHOOK_SECRET = "__WEBHOOK_SECRET__"


WEBHOOK_SECRET_RULE_RE = re.compile(
    r'(@request\.(?:headers\.x_webhook_secret|query\.webhook_secret)\s*=\s*")([^"]+)(")'
)


def sanitize_rule(value):
    if not isinstance(value, str) or not value:
        return value
    return WEBHOOK_SECRET_RULE_RE.sub(r"\1" + REDACTED_WEBHOOK_SECRET + r"\3", value)


# Usage: python3 dump_schema.py <pb_url> <admin_email> <admin_pass>
# Example: python3 dump_schema.py http://127.0.0.1:8090/_/ admin@example.com 123456


def dump_schema(base_url, email, password):
    print(f"Connecting to PocketBase at {base_url}...")

    # Authenticate (PB 0.23+ Superusers)
    auth_url = f"{base_url.rstrip('/')}/api/collections/_superusers/auth-with-password"
    try:
        resp = requests.post(
            auth_url, json={"identity": email, "password": password}, verify=False
        )
        resp.raise_for_status()
        token = resp.json()["token"]
        print("Auth OK")
    except Exception as e:
        print(f"ERROR: Auth failed: {e}")
        return

    headers = {"Authorization": f"{token}"}

    # Fetch All Collections
    print("Fetching collections...")
    list_url = f"{base_url.rstrip('/')}/api/collections?perPage=200"
    resp = requests.get(list_url, headers=headers, verify=False)
    if resp.status_code != 200:
        print(f"ERROR: Failed to fetch collections: {resp.text}")
        return

    all_collections = resp.json().get("items", [])

    # Filter and Clean
    output_collections = []
    for col in all_collections:
        # Construct clean definition object matching our schema_definitions.json format
        clean_col = {
            "name": col["name"],
            "type": col["type"],
            "fields": col["fields"],  # PB 0.23+ uses 'fields'
            "indexes": col.get("indexes", []),
            "listRule": sanitize_rule(col.get("listRule")),
            "viewRule": sanitize_rule(col.get("viewRule")),
            "createRule": sanitize_rule(col.get("createRule")),
            "updateRule": sanitize_rule(col.get("updateRule")),
            "deleteRule": sanitize_rule(col.get("deleteRule")),
        }

        output_collections.append(clean_col)

    # Write to File
    output_path = os.path.join(
        os.path.dirname(__file__), "../assets/schema_definitions.json"
    )
    try:
        with open(output_path, "w") as f:
            json.dump(output_collections, f, indent=2)
        print(
            f"OK: Schema dumped to {output_path} ({len(output_collections)} collections)"
        )
    except Exception as e:
        print(f"ERROR: Write failed: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 dump_schema.py <url> <email> <password>")
    else:
        dump_schema(sys.argv[1], sys.argv[2], sys.argv[3])
