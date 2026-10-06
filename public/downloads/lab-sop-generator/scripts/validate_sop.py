#!/usr/bin/env python3
"""Validate DigitalLab SOP JSON using the shipped schema and cross-field rules."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

def check(value, schema, path, errors):
    kinds = {"object": dict, "array": list, "string": str, "integer": int, "number": (int, float), "boolean": bool}
    kind = schema.get("type")
    if kind in kinds and (not isinstance(value, kinds[kind]) or kind in ("integer", "number") and isinstance(value, bool)):
        errors.append(f"{path}: expected {kind}")
        return
    if "const" in schema and (value != schema["const"] or type(value) is not type(schema["const"])):
        errors.append(f"{path}: must equal {schema['const']!r}")
    if isinstance(value, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}.{key}: missing required field")
        for key, item in value.items():
            if key in props:
                check(item, props[key], f"{path}.{key}", errors)
            elif schema.get("additionalProperties") is False:
                errors.append(f"{path}.{key}: unknown field")
    if isinstance(value, list):
        if len(value) > schema.get("maxItems", float("inf")) or len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: wrong number of items")
        for i, item in enumerate(value):
            check(item, schema.get("items", {}), f"{path}[{i}]", errors)
    if isinstance(value, str):
        length = len(value.encode("utf-16-le")) // 2
        if length > schema.get("maxLength", float("inf")) or not value.strip() and schema.get("minLength", 0) > 0 or length < schema.get("minLength", 0):
            errors.append(f"{path}: invalid text length")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path}: invalid format")
        if path.endswith(".url") and value:
            parsed = urlsplit(value)
            if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc:
                errors.append(f"{path}: only http/https URLs are allowed")

def validate(path):
    source = Path(path).read_bytes()
    if len(source) > 1024 * 1024:
        raise ValueError("File exceeds 1MB")
    doc = json.loads(source.decode("utf-8-sig"))
    schema = json.loads((Path(__file__).resolve().parents[1] / "references/schema.json").read_text(encoding="utf-8"))
    errors = []
    check(doc, schema, "$", errors)
    if isinstance(doc, dict) and isinstance(doc.get("sops"), list):
        for tip in doc.get("labelTips", []):
            if isinstance(tip, str) and re.search(r"[\r\n]|\*\*|__|`|\[[^\]]*\]\(", tip):
                errors.append("$.labelTips: require single-line plain text")
        profiles = doc["sops"]
        if not 1 <= len(profiles) <= 20:
            errors.append("$.sops: require 1–20 SOPs")
        ids, names = set(), set()
        for i, p in enumerate(profiles):
            if not isinstance(p, dict):
                continue
            for key, seen in (("id", ids), ("name", names)):
                value = p.get(key)
                if isinstance(value, str):
                    normalized = value.strip().lower()
                    if normalized in seen:
                        errors.append(f"$.sops[{i}].{key}: duplicate")
                    seen.add(normalized)
            if isinstance(p.get("steps"), list) and not p["steps"]:
                errors.append(f"$.sops[{i}].steps: require at least one step")
    return errors

if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Usage: python3 validate_sop.py FILE.sop.json")
        errors = validate(sys.argv[1])
        if errors:
            print("\n".join(errors[:20]), file=sys.stderr)
            sys.exit(1)
        print("Valid DigitalLab SOP document")
    except (ValueError, OSError, TypeError) as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        sys.exit(1)
