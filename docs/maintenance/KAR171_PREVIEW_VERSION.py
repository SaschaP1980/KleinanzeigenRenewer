#!/usr/bin/env python3
"""Pin an isolated KAR-171 installable Work preview to v1.25.13.

Version metadata only. No GitHub Release or live account interaction.
Run in a clean, exact main v1.25.12 -> work/KAR-171 merge result.
"""
import json
from pathlib import Path

BASE="1.25.12"
NEXT="1.25.13"
root=Path(__file__).resolve().parents[2]
manifest_path=root/"manifest.json"
package_path=root/"package.json"
package_lock_path=root/"package-lock.json"
release_spec_path=root/"release/release-spec.json"
changelog_path=root/"CHANGELOG.md"
manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
package=json.loads(package_path.read_text(encoding="utf-8"))
lock=json.loads(package_lock_path.read_text(encoding="utf-8"))
spec=json.loads(release_spec_path.read_text(encoding="utf-8"))
if any(z.get("version")!=BASE for z in [manifest,package,lock,spec]) \
  or package.get("displayVersion")!=BASE or lock.get("packages",{}).get("",{}).get("version")!=BASE \
  or spec.get("packageVersion")!=BASE:
    raise SystemExit("KAR171_PREVIEW_VERSION_DENIED: expected exact main v1.25.12 four-file metadata")
if manifest.get("version_name"):
    raise SystemExit("KAR171_PREVIEW_VERSION_DENIED: unsupported manifest version_name")
manifest["version"]=NEXT
package["version"]=NEXT
package["displayVersion"]=NEXT
lock["version"]=NEXT
lock["packages"][""]["version"]=NEXT
spec["version"]=NEXT
spec["packageVersion"]=NEXT
changelog=changelog_path.read_text(encoding="utf-8")
heading="## v1.25.12"
if changelog.count(heading)!=1 or "## v1.25.13" in changelog:
    raise SystemExit("KAR171_PREVIEW_VERSION_DENIED: changelog identity changed")
new_entry="""## v1.25.13 — KAR-171 upstream-integrated R1 test build (Work only; not released)

- Integrate current main v1.25.12 into the isolated `work/KAR-171` branch, preserving #195, #197, #199 and #201 improvements.
- Preserve and independently test original P8 publication/Phase-4 provenance, authenticated account-bound My Ads source/target whole-roster read-only checks, worker generation safety and fail-closed remote outcome.
- This is an owner-requested installable test build only. R1 is NOT ACCEPTED; no updater lease or NativeHost apply, Chrome reload, actual listing mutation, main merge or GitHub Release is authorized by this version.

"""
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
package_path.write_text(json.dumps(package,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
package_lock_path.write_text(json.dumps(lock,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
release_spec_path.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
changelog_path.write_text(changelog.replace(heading,new_entry+heading,1),encoding="utf-8")
print("KAR171_PREVIEW_VERSION",NEXT,"Work only; release not authorized")
