import urllib.request
import urllib.parse

BASE = "https://dm-solitaire-production.up.railway.app"
CANDS = [
    "dm23rp1-032",
    "promoy22-004",
    "dm23rp1-032a",
    "dm23rp1-032b",
    "dm23rp1-032A",
    "dm23rp1-032B",
]

for cid in CANDS:
    raw = f"https://dm.takaratomy.co.jp/wp-content/card/cardthumb/{cid}.jpg"
    proxy = f"{BASE}/img?url={urllib.parse.quote(raw, safe='')}"
    try:
        with urllib.request.urlopen(proxy, timeout=60) as r:
            data = r.read(128)
            print("PROXY", cid, "status", r.status, "ctype", r.headers.get("Content-Type"), "bytes", len(data))
    except Exception as e:
        print("PROXY", cid, "ERR", type(e).__name__, e)

for cid in CANDS:
    raw = f"https://dm.takaratomy.co.jp/wp-content/card/cardthumb/{cid}.jpg"
    try:
        req = urllib.request.Request(raw, method="GET", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read(128)
            print("RAW", cid, "status", r.status, "ctype", r.headers.get("Content-Type"), "bytes", len(data))
    except Exception as e:
        print("RAW", cid, "ERR", type(e).__name__, e)
