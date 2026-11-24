#!/usr/bin/env python3
"""KAR-210: four-component technical baseline identity regression."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location(
    "kar210_zip_identity", ROOT / "scripts/verify_committed_chrome_zip.py")
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
app_id = (ROOT / "APP_ID.txt").read_text(encoding="utf-8")


class VersionIdentity(unittest.TestCase):
    def test_legacy_identity(self):
        legacy = {**manifest, "version": "1.23.48",
                  "permissions": sorted(set(verifier.PERMISSIONS) | {"nativeMessaging"})}
        verifier.check_identity(legacy, app_id)

    def test_four_component_identity(self):
        # Use the authorized permission contract of the checked source, not
        # permission changes inferred from the version alone.
        for version in ("2.0.0.0", "2.0.0.1", "2.0.0.65535"):
            with self.subTest(version=version):
                verifier.check_identity({**manifest, "version": version}, app_id)

    def test_invalid_four_component_identity(self):
        for version in ("2.0.0", "2.0.0.01", "2.0.0.65536",
                        "2.0.-1.0", "2.0.0.0.1", "0.0.0.0"):
            with self.subTest(version=version):
                with self.assertRaises(ValueError):
                    verifier.check_identity({**manifest, "version": version}, app_id)


if __name__ == "__main__":
    unittest.main(verbosity=2)
