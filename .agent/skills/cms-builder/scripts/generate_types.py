import json
import os

# Usage: python3 generate_types.py
# Reads ../assets/schema_definitions.json and outputs ./cms.d.ts

TYPE_MAP = {
    "text": "string",
    "editor": "string",
    "email": "string",
    "url": "string",
    "date": "string",
    "select": "string",
    "file": "string",  # Usually filename
    "relation": "string", # ID of related record
    "number": "number",
    "bool": "boolean",
    "json": "any",
}

SYSTEM_FIELDS = [
    "id: string;",
    "collectionId: string;",
    "collectionName: string;",
    "created: string;",
    "updated: string;",
]

# Fields to skip when processing schema (already in SYSTEM_FIELDS or duplicates)
SKIP_FIELDS = {"id", "created", "updated"}

# 1. Custom Interface Definitions (Injected at the top)
CUSTOM_INTERFACES = """
export interface CartItemSnapshot {
  productId: string;
  variantId?: string;
  quantity: number;
}
"""

# 2. Field Type Overrides (collection_name, field_name) -> typescript_type
FIELD_OVERRIDES = {
    ("user_lists", "type"): "'cart' | 'wishlist' | 'save_for_later'",
    ("user_lists", "items"): "CartItemSnapshot[]",
    ("products", "attributes"): "Record<string, any>",
}

def generate_types():
    try:
        with open("../assets/schema_definitions.json", "r") as f:
            collections = json.load(f)
    except FileNotFoundError:
        print("❌ schema_definitions.json not found in ../assets/")
        return

    output = []
    output.append("// schema-generated types")
    output.append(CUSTOM_INTERFACES)

    for col in collections:
        col_name = col["name"]
        interface_name = "".join(x.title() for x in col_name.split("_")) # snake_case to PascalCase
        
        output.append(f"export interface {interface_name} {{")
        
        # System fields
        for field in SYSTEM_FIELDS:
             output.append(f"  {field}")
        
        # Schema fields
        for field in col["fields"]:
            f_name = field["name"]
            
            # Skip fields already defined in SYSTEM_FIELDS
            if f_name in SKIP_FIELDS:
                continue
            
            # Check for overrides first
            if (col_name, f_name) in FIELD_OVERRIDES:
                ts_type = FIELD_OVERRIDES[(col_name, f_name)]
            else:
                f_type = field["type"]
                ts_type = TYPE_MAP.get(f_type, "any")
                
                # Handle special cases if not overridden
                if f_type == "relation":
                    # Relations can be multiple if configured (not captured in simple schema but let's assume single ID for base)
                    pass 
                
            required = field.get("required", False)
            modifier = "" if required else "?"
            
            output.append(f"  {f_name}{modifier}: {ts_type};")
            
        output.append("}")
        output.append("")

    with open("cms.d.ts", "w") as f:
        f.write("\n".join(output))
        
    print(f"✅ Generated cms.d.ts with {len(collections)} interfaces.")

if __name__ == "__main__":
    generate_types()
