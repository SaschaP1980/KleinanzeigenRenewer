#!/usr/bin/env python3
"""KAR-52 positive and fail-closed negative policy; no Git/ZIP write."""
import copy
import importlib.util
import json
import os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("kar52", ROOT / "scripts/kar-atomic-patch.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def reject(label, action):
    try:
        action()
    except ValueError as exc:
        assert "KAR52_PATCH_FAILED" in str(exc), (label, exc)
        return
    raise AssertionError("wrongly accepted: " + label)

original = m.load_meta() if hasattr(m,"load_meta") else {p:json.loads((ROOT/p).read_text()) for p in m.META}
snap = json.dumps(original, sort_keys=True)
current, nxt, new = m.metadata_plan(original)
assert nxt == m.successor(current)
assert m.successor("1.23.25") == "1.23.26"
assert m.successor("1.23.26") == "1.23.27"
assert json.dumps(original, sort_keys=True) == snap
assert new["manifest.json"]["key"] == original["manifest.json"]["key"]
assert new["manifest.json"]["permissions"] == original["manifest.json"]["permissions"]
assert new["manifest.json"]["host_permissions"] == original["manifest.json"]["host_permissions"]
assert new["package-lock.json"]["packages"][""]["version"] == nxt
assert new["package.json"]["displayVersion"] == nxt
assert new["release/release-spec.json"]["packageVersion"] == nxt
for p in m.META:
    before, after = original[p], new[p]
    assert set(before) == set(after)
    for k in before:
        if k not in ["version", "displayVersion", "packageVersion", "packages"]:
            assert before[k] == after[k], (p,k)
rejects=0
for value in ["1.23.21","1.23.025","1.23.25_c1","1.24.0","1.22.99",
              "1.23.-1","1.23.2147483647",None,{},123,""]:
    reject("version "+repr(value), lambda v=value:m.successor(v)); rejects+=1
for p,k in [("package.json","version"),("package.json","displayVersion"),
            ("package-lock.json","version"),("release/release-spec.json","packageVersion"),
            ("release/release-spec.json","directBasis")]:
    d=copy.deepcopy(original);d[p][k]="incorrect"
    reject("metadata "+p+":"+k,lambda x=d:m.metadata_plan(x));rejects+=1
d=copy.deepcopy(original);d["package-lock.json"]["packages"][""]["version"]="incorrect"
reject("nested lock root",lambda:m.metadata_plan(d));rejects+=1
reject("missing documents",lambda:m.metadata_plan({"manifest.json":original["manifest.json"]}));rejects+=1
reject("foreign issue branch",lambda:m.assert_lease(52,"work/KAR-53","a"*40,"b"*40));rejects+=1
reject("invalid expected SHA",lambda:m.assert_lease(52,"work/KAR-52","bad","b"*40));rejects+=1
event=os.environ.pop("GITHUB_EVENT_NAME",None)
try:
    reject("write without a qualified explicit event",lambda:m.build({},{}));rejects+=1
finally:
    if event is not None:os.environ["GITHUB_EVENT_NAME"]=event
sha="a"*40
m.authorized_push("ci(KAR-54): atomic PATCH base="+sha, "", 54, sha)
for marker,changed,issue,base in [
    ("ci(KAR-53): atomic PATCH base="+sha,"",54,sha),
    ("ci(KAR-54): atomic PATCH base="+"b"*40,"",54,sha),
    ("ci(KAR-54): atomic PATCH base="+sha+" extra","",54,sha),
    ("ci(KAR-54): atomic PATCH base="+sha,"manifest.json",54,sha),
    ("build(KAR-54): atomic PATCH base="+sha,"",54,sha)]:
    reject("unauthorized/nonempty guarded push",lambda a=marker,b=changed,c=issue,d=base:m.authorized_push(a,b,c,d))
    rejects+=1
assert json.dumps({p:json.loads((ROOT/p).read_text()) for p in m.META},sort_keys=True)==snap

# KAR-132: second Work PATCH before main merge. The previous immutable ZIP may
# be sealed by an earlier exact-scope atomic build commit in this same Work
# branch rather than already present in main. Do not accept arbitrary blobs.
from types import SimpleNamespace
from unittest.mock import patch

test_sha = "c" * 40
main_sha = "a" * 40
sealed_sha = "b" * 40
old_path = "release/kleinanzeigen-renewal-chrome-v1.23.38.zip"
sealed_zip = b"PREVIOUS SEALED ZIP FIXTURE"
changed = set([*m.META, old_path])
def fake_git(*args):
    if args == ("log","-1","--format=%H",test_sha,"--",old_path): return sealed_sha
    if args == ("show","-s","--format=%s",sealed_sha): return "build(KAR-132): atomic PATCH 1.23.38 plus ZIP"
    if args == ("diff-tree","--no-commit-id","--name-only","-r",sealed_sha): return "\n".join(sorted(changed))
    # A prior sealed ZIP can predate a later main merge. Require proof it remains\n    # an ancestor of the exact current Work source, not retroactive main ancestry.\n    if args == ("merge-base","--is-ancestor",sealed_sha,test_sha): return ""
    raise AssertionError("Unexpected Git command: "+repr(args))
def fake_run(*args, **kwargs):
    if args == ("git","show",sealed_sha+":"+old_path) and kwargs.get("binary"): return sealed_zip
    if args[0:3] == ("git","show",sealed_sha+":manifest.json"): return '{"version":"1.23.38"}'
    if args[0:3] == ("git","show",sealed_sha+":package.json"): return '{"version":"1.23.38"}'
    if args[0:3] == ("git","show",sealed_sha+":package-lock.json"): return '{"version":"1.23.38"}'
    if args[0:3] == ("git","show",sealed_sha+":release/release-spec.json"): return '{"version":"1.23.38"}'
    raise AssertionError("Unexpected external call: "+repr((args,kwargs)))
with patch.object(m, "git", side_effect=fake_git), patch.object(m, "run", side_effect=fake_run), patch.object(m.subprocess, "run", return_value=SimpleNamespace(returncode=1)):
    assert m.sealed_prior_archive(132, main_sha, test_sha, old_path, "1.23.38") == (sealed_zip, "work")
    with patch.object(m, "git", side_effect=lambda *args: "build(KAR-OTHER): atomic PATCH 1.23.38 plus ZIP" if args[:3] == ("show","-s","--format=%s") else fake_git(*args)):
        reject("foreign previous Work PATCH seal",lambda:m.sealed_prior_archive(132,main_sha,test_sha,old_path,"1.23.38"));rejects+=1
    with patch.object(m, "git", side_effect=lambda *args: "\n".join(sorted(changed | {"src/background/background.js"})) if args[0]=="diff-tree" else fake_git(*args)):
        reject("previous PATCH extra mutated path",lambda:m.sealed_prior_archive(132,main_sha,test_sha,old_path,"1.23.38"));rejects+=1
    with patch.object(m, "run", side_effect=lambda *args,**kwargs: b"ALTERED ZIP" if kwargs.get("binary") else fake_run(*args,**kwargs)):
        assert m.sealed_prior_archive(132,main_sha,test_sha,old_path,"1.23.38")[0] != sealed_zip, "mutated previous ZIP fixture detected downstream"

print("PASS KAR-52 dynamic next-PATCH "+current+" -> "+nxt+" with "+str(rejects)+" fail-closed policy negatives and no mutation")
