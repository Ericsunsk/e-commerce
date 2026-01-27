import requests
import json
import sys
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# Usage: python3 dump_schema.py <pb_url> <admin_email> <admin_pass>
# Example: python3 dump_schema.py http://127.0.0.1:8090/_/ admin@example.com 123456

def dump_schema(base_url, email, password):
    print(f"🚀 Connecting to PocketBase at {base_url}...")
    
    # Authenticate (PB 0.23+ Superusers)
    auth_url = f"{base_url.rstrip('/')}/api/collections/_superusers/auth-with-password"
    try:
        resp = requests.post(auth_url, json={"identity": email, "password": password}, verify=False)
        resp.raise_for_status()
        token = resp.json()["token"]
        print("✅ Authentication successful.")
    except Exception as e:
        print(f"❌ Auth failed: {e}")
        return

    headers = {"Authorization": f"{token}"}
    
    # Fetch All Collections
    print("📥 Fetching collections...")
    list_url = f"{base_url.rstrip('/')}/api/collections?perPage=200"
    resp = requests.get(list_url, headers=headers, verify=False)
    if resp.status_code != 200:
        print(f"❌ Failed to fetch collections: {resp.text}")
        return
        
    all_collections = resp.json().get("items", [])
    
    # Filter and Clean
    output_collections = []
    for col in all_collections:
        # Construct clean definition object matching our schema_definitions.json format
        clean_col = {
            "name": col["name"],
            "type": col["type"],
            "fields": col["fields"], # PB 0.23+ uses 'fields'
            "indexes": col.get("indexes", []),
            "listRule": col.get("listRule"),
            "viewRule": col.get("viewRule"),
            "createRule": col.get("createRule"),
            "updateRule": col.get("updateRule"),
            "deleteRule": col.get("deleteRule")
        }
        
        output_collections.append(clean_col)
        
    # Write to File
    output_path = "../assets/schema_definitions.json"
    try:
        with open(output_path, "w") as f:
            json.dump(output_collections, f, indent=2)
        print(f"✅ Schema dumped to {output_path} ({len(output_collections)} collections)")
    except Exception as e:
        print(f"❌ Write failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 dump_schema.py <url> <email> <password>")
    else:
        dump_schema(sys.argv[1], sys.argv[2], sys.argv[3])
