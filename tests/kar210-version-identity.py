#!/usr/bin/env python3
"""KAR-210: four-component technical baseline identity regression."""
import importlib.util
import json
from pathlib import Path
import unittest
import tempfile
from unittest.mock import patch

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


    def test_archive_cli_uses_product_version(self):
        for version, label in (("2.0.0.0", None), ("1.23.21", "1.23.20_c1")):
            with self.subTest(version=version, label=label), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                fixture = {**manifest, "version": version}
                if label is not None:
                    fixture["version_name"] = label
                (root / "manifest.json").write_text(json.dumps(fixture), encoding="utf-8")
                # The archive need not exist: reaching the missing-file gate proves
                # the real CLI accepted the label, without bypassing byte parity.
                with patch.object(verifier, "ROOT", root), patch("sys.argv", ["verify"]):
                    with self.assertRaisesRegex(ValueError, "versioned Chrome ZIP missing"):
                        verifier.main()

    def test_archive_cli_rejects_mismatched_label(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture = {**manifest, "version": "2.0.0.0", "version_name": "1.23.48"}
            (root / "manifest.json").write_text(json.dumps(fixture), encoding="utf-8")
            with patch.object(verifier, "ROOT", root), patch("sys.argv", ["verify"]):
                with self.assertRaisesRegex(ValueError, "unsafe/unsupported package version"):
                    verifier.main()


if __name__ == "__main__":
    unittest.main(verbosity=2)
