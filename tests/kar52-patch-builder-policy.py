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
print("PASS KAR-52 dynamic next-PATCH "+current+" -> "+nxt+" with "+str(rejects)+" fail-closed policy negatives and no mutation")
