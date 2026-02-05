import requests
import json
import sys
import datetime
import os
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# Usage: python3 provision_schema.py <pb_url> <admin_email> <admin_pass>
# Example: python3 provision_schema.py http://127.0.0.1:8090/_/ admin@example.com 123456

def create_backup(base_url, headers):
    print("💾 Creating safety backup...")
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"pre_provision_{timestamp}"
        
        # Checking backups
        # In PB, creating a backup is a POST to /api/backups with {"name": ...}
        backup_url = f"{base_url.rstrip('/')}/api/backups"
        resp = requests.post(backup_url, json={"name": backup_name}, headers=headers, verify=False)
        
        if resp.status_code == 200:
             print(f"  ✅ Backup created: {backup_name}")
        else:
             print(f"  ⚠️ Backup creation failed: {resp.text}")
             print("  ⚠️ Proceeding with caution...")
    except Exception as e:
        print(f"  ⚠️ Backup error: {e}")

def sync_system_settings(base_url, headers):
    assets_dir = os.path.join(os.path.dirname(__file__), "../assets")
    settings_path = os.path.join(assets_dir, "system_settings.json")
    try:
        with open(settings_path, "r") as f:
            settings_data = json.load(f)
            
        settings_url = f"{base_url.rstrip('/')}/api/settings"
        resp = requests.patch(settings_url, json=settings_data, headers=headers, verify=False)
        
        if resp.status_code == 200:
            print("  ✅ System settings updated.")
        else:
            print(f"  ❌ Failed to update settings: {resp.text}")
            
    except FileNotFoundError:
        print("  ℹ️ No system_settings.json found, skipping.")
    except Exception as e:
         print(f"  ❌ Settings sync error: {e}")

def provision_schema(base_url, email, password):
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
    
    # 0. Safety Backup
    create_backup(base_url, headers)
    
    # 1. Sync System Settings (SMTP etc)
    sync_system_settings(base_url, headers)
    
    # 2. Load Schema
    assets_dir = os.path.join(os.path.dirname(__file__), "../assets")
    schema_path = os.path.join(assets_dir, "schema_definitions.json")
    
    try:
        with open(schema_path, "r") as f:
            target_collections = json.load(f)
    except FileNotFoundError:
        print(f"❌ schema_definitions.json not found at {schema_path}")
        return

    # 3. Process Collections
    for target_col in target_collections:
        col_name = target_col["name"]
        print(f"Checking collection: {col_name}...")
        
        # Check if exists
        try:
            get_resp = requests.get(f"{base_url.rstrip('/')}/api/collections/{col_name}", headers=headers, verify=False)
        except:
             get_resp = None
             
        if get_resp and get_resp.status_code == 200:
            # Collection exists -> Check for Diff & Patch
            existing_col = get_resp.json()
            existing_fields = {f["name"]: f for f in existing_col["fields"]}
            
            payload = {}
            has_changes = False

            # Check Fields (Deep Sync Logic)
            fields_payload = []
            field_changes_detected = False
            
            # 1. Update/Add fields from target
            for target_field in target_col["fields"]:
                if target_field["name"] not in existing_fields:
                    print(f"  + New field detected: {target_field['name']}")
                    fields_payload.append(target_field)
                    field_changes_detected = True
                else:
                    # Check if properties changed (e.g. presentable)
                    existing_f = existing_fields[target_field["name"]]
                    field_needs_update = False
                    for key, val in target_field.items():
                        if key != "id" and existing_f.get(key) != val:
                            field_needs_update = True
                            break
                    
                    if field_needs_update:
                        print(f"  * Field update detected: {target_field['name']}")
                        # Keep existing ID but update properties
                        merged_field = existing_f.copy()
                        merged_field.update(target_field)
                        fields_payload.append(merged_field)
                        field_changes_detected = True
                    else:
                        fields_payload.append(existing_f)

            # 2. Check for fields to remove
            target_field_names = [f["name"] for f in target_col["fields"]]
            system_fields = ["id", "created", "updated"]
            for existing_f_name in existing_fields:
                if existing_f_name not in target_field_names and existing_f_name not in system_fields:
                    print(f"  - Field removal detected: {existing_f_name}")
                    field_changes_detected = True
                    # By not adding it to fields_payload, it will be removed on PATCH

            if field_changes_detected:
                payload["fields"] = fields_payload
                has_changes = True

            # Check API Rules & Indexes (Strict Sync)
            api_rules = ["listRule", "viewRule", "createRule", "updateRule", "deleteRule", "indexes"]
            updated_rules = []
            for rule in api_rules:
                if rule in target_col:
                    target_val = target_col[rule]
                    existing_val = existing_col.get(rule)
                    if target_val != existing_val:
                        payload[rule] = target_val
                        updated_rules.append(rule)
            
            if updated_rules:
                print(f"  + Updating API Rules: {', '.join(updated_rules)}")
                has_changes = True
            
            if has_changes:
                print(f"  - Patching {col_name}...")
                update_url = f"{base_url.rstrip('/')}/api/collections/{existing_col['id']}"
                update_resp = requests.patch(update_url, json=payload, headers=headers, verify=False)
                if update_resp.status_code == 200:
                    print(f"  ✅ {col_name} updated successfully.")
                else:
                    print(f"  ❌ Failed to update {col_name}: {update_resp.text}")
            else:
                print(f"  - {col_name} is up to date.")
                
        else:
            # Collection does not exist -> Create
            print(f"  - Creating {col_name}...")
            create_url = f"{base_url.rstrip('/')}/api/collections"
            create_resp = requests.post(create_url, json=target_col, headers=headers, verify=False)
            if create_resp.status_code == 200:
                 print(f"  ✅ {col_name} created.")
            else:
                 print(f"  ❌ Failed to create {col_name}: {create_resp.text}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 provision_schema.py <url> <email> <password>")
    else:
        provision_schema(sys.argv[1], sys.argv[2], sys.argv[3])
