import json
import time
import urllib.parse
import urllib.request

CARD = "\u30de\u30b8\u30c3\u30af\u30fbA\u30fb\u30bb\u30df\u30d7\u30fc\u30ed\uff0f\u266a\u9591\u304b\u3055\u3084 \u3068\u306b\u304b\u304f\u30d6\u30ec\u30a4\u30f3 \u8749\u30df\u30f3\u30df\u30f3"
ID = "dmwiki_" + CARD

bases = [
    "http://localhost:8765",
    "https://dm-solitaire-production.up.railway.app",
]

for base in bases:
    print("BASE", base)
    for path in [
        "/ping",
        "/detail?id=" + urllib.parse.quote(ID, safe=""),
        "/detail?name=" + urllib.parse.quote(CARD, safe=""),
        "/illustrations?name=" + urllib.parse.quote(CARD, safe=""),
    ]:
        url = base + path
        t0 = time.time()
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                body = r.read().decode("utf-8")
                ms = int((time.time() - t0) * 1000)
                print("PATH", path, "MS", ms, "STATUS", r.status)
                data = json.loads(body)
                if path.startswith("/detail"):
                    text = str(data.get("text") or "")
                    print(" name", data.get("name"))
                    print(" image", data.get("imageUrl") or data.get("img") or data.get("thumb"))
                    print(" text_len", len(text))
                    print(" text_head", text[:140].replace("\n", "\\n"))
                elif path.startswith("/illustrations"):
                    print(" count", data.get("count"))
                    for o in (data.get("options") or [])[:6]:
                        print("  ", o.get("artId"), o.get("label"), o.get("name"))
                else:
                    print(" body", data)
        except Exception as e:
            ms = int((time.time() - t0) * 1000)
            print("PATH", path, "MS", ms, "ERR", type(e).__name__, e)
