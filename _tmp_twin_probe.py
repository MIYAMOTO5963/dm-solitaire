import importlib.util

spec = importlib.util.spec_from_file_location("dmp", "dm-proxy-server.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

name = "\u30de\u30b8\u30c3\u30af\u30fbA\u30fb\u30bb\u30df\u30d7\u30fc\u30ed\uff0f\u266a\u9591\u304b\u3055\u3084 \u3068\u306b\u304b\u304f\u30d6\u30ec\u30a4\u30f3 \u8749\u30df\u30f3\u30df\u30f3"
print("NAME", name)
print("DMWIKI_CANDIDATES")
for c in mod._dmwiki_name_candidates(name):
    print(" ", repr(c))

html = mod._dmwiki_page_html(name)
print("HTML_LEN", len(html or ""))
print("IMG_DMHTML", mod._img_from_dmwiki_html(html or ""))
print("IMG_DMSET", mod._img_from_dmwiki_setcode(html or ""))
print("IMG_DMATTC", mod._img_from_dmwiki_attach(name))

detail = mod.get_card_detail_dmwiki(name)
print("DETAIL_NONE", detail is None)
if detail:
    print("DETAIL_NAME", detail.get("name"))
    print("DETAIL_IMG", detail.get("img"))
    print("DETAIL_TEXT_LEN", len(str(detail.get("text") or "")))

print("OFFICIAL_VARIANTS")
for v in mod._official_art_variants(name, limit=10):
    print(" ", v.get("artId"), v.get("name"), v.get("label"), v.get("source"))

print("IMG_FROM_OFFICIAL", mod._img_from_official(name))

# Compare strict matcher on first and second side names
left = "\u30de\u30b8\u30c3\u30af\u30fbA\u30fb\u30bb\u30df\u30d7\u30fc\u30ed"
right = "\u266a\u9591\u304b\u3055\u3084 \u3068\u306b\u304b\u304f\u30d6\u30ec\u30a4\u30f3 \u8749\u30df\u30f3\u30df\u30f3"
print("MATCH_FULL_LEFT", mod._official_name_matches(name, left))
print("MATCH_FULL_RIGHT", mod._official_name_matches(name, right))
