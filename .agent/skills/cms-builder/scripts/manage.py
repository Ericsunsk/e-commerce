import argparse
import os
import sys
# Import existing modules (assuming they are in the same dir)
from provision_schema import provision_schema
from seed_data import seed_data
from dump_schema import dump_schema
from generate_types import generate_types

# Usage:
# export PB_URL="http://..." PB_EMAIL="..." PB_PASS="..."
# python3 manage.py apply
# python3 manage.py dump

def load_env():
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
                    os.environ[key.strip()] = val.strip()
    except FileNotFoundError:
        print(f"⚠️ Warning: .env not found at {env_path}")

def get_creds():
    # Prefer POCKETBASE_* names from root .env
    url = os.environ.get("PUBLIC_POCKETBASE_URL") or os.environ.get("POCKETBASE_URL", "http://127.0.0.1:8090")
    email = os.environ.get("POCKETBASE_ADMIN_EMAIL") or os.environ.get("PB_ADMIN_EMAIL")
    password = os.environ.get("POCKETBASE_ADMIN_PASSWORD") or os.environ.get("PB_ADMIN_PASSWORD")
    
    if not email or not password:
        print("❌ Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env")
        sys.exit(1)
        
    return url, email, password

def main():
    parser = argparse.ArgumentParser(description="CMS Builder Management CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Apply (Provision + Seed)
    subparsers.add_parser("apply", help="Apply Schema and Seed Data")
    
    # Dump
    subparsers.add_parser("dump", help="Dump Schema from Remote to JSON")
    
    # Types
    subparsers.add_parser("types", help="Generate TypeScript Interfaces")

    # Seed
    subparsers.add_parser("seed", help="Run Seed Data Only")

    args = parser.parse_args()
    load_env()

    if args.command == "types":
        generate_types()
        return

    url, email, password = get_creds()

    if args.command == "apply":
        print("📦 Step 1: Provisioning Schema...")
        provision_schema(url, email, password)
        print("\n🌱 Step 2: Seeding Data...")
        seed_data(url, email, password)
    
    elif args.command == "seed":
        seed_data(url, email, password)
        
    elif args.command == "dump":
        dump_schema(url, email, password)

if __name__ == "__main__":
    main()
