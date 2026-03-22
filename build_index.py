#!/usr/bin/env python3
"""
build_index.py - dmwikiから全カード名をローカルインデックスに登録するスクリプト。
ローカルで実行し、生成された dm_cache.db をコミットすることで
本番サーバーの初回検索を高速化する。

使い方:
    python build_index.py [--db PATH] [--delay 0.5]
"""

import argparse
import os
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request

DMWIKI_BASE = "https://dmwiki.net"
WIKI_HEADERS = {"User-Agent": "DMSolitaireTool/1.0 (build-index)"}

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "dm_cache.db")

# カタカナ全文字 + よく使う漢字頭文字 で検索網を張る
# ほぼすべてのDMカード名はカタカナを含むため、これで網羅できる
SEARCH_TERMS = list(
    "アイウエオカキクケコサシスセソタチツテトナニヌネノ"
    "ハヒフヘホマミムメモヤユヨラリルレロワヲン"
    "ァィゥェォッャュョヴ"
) + [
    # カタカナを含まない純漢字カード向け補完
    "勝", "覇", "龍", "神", "王", "聖", "魔", "天", "地", "炎",
    "水", "光", "闇", "風", "雷", "剣", "盾", "鎧", "城", "海",
]


def _fetch(url: str, post_data: bytes = None, timeout: float = 15.0) -> str:
    headers = {**WIKI_HEADERS, "Accept-Language": "ja,en;q=0.5"}
    if post_data:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(url, data=post_data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            for enc in ("utf-8", "euc-jp", "shift_jis"):
                try:
                    return raw.decode(enc)
                except UnicodeDecodeError:
                    pass
            return raw.decode("utf-8", errors="replace")
    except Exception as e:
        print(f"[fetch] {e}", file=sys.stderr)
        return ""


def _parse_card_names(html: str) -> list[str]:
    """HTMLから《カード名》を抽出する。"""
    names = []
    seen: set[str] = set()
    for m in re.finditer(r'(?:[?&;])page=([^&"\'<>;]+)', html):
        try:
            page_name = urllib.parse.unquote(m.group(1), encoding="utf-8")
        except Exception:
            continue
        if not (page_name.startswith("《") and page_name.endswith("》")):
            continue
        name = page_name[1:-1]
        if name and name not in seen:
            seen.add(name)
            names.append(name)
    return names


def fetch_all_card_names(delay: float = 0.5) -> list[str]:
    """カタカナ全文字で検索してdmwiki全カード名を収集する。"""
    all_names: list[str] = []
    seen: set[str] = set()

    total = len(SEARCH_TERMS)
    for i, term in enumerate(SEARCH_TERMS, 1):
        print(f"\r[1/3] 検索中... {i}/{total} ({term}) 累計 {len(seen)} 件", end="", flush=True)

        form = urllib.parse.urlencode(
            {"word": term, "type": "AND", "scope": "page"}, encoding="utf-8"
        ).encode()
        html = _fetch(f"{DMWIKI_BASE}/?cmd=search", post_data=form)
        if html:
            for name in _parse_card_names(html):
                if name not in seen:
                    seen.add(name)
                    all_names.append(name)

        time.sleep(delay)

    print(f"\r[1/3] 検索完了: {len(all_names)} 件のカード名を検出          ", flush=True)
    return all_names


def init_search_index(db_path: str) -> None:
    con = sqlite3.connect(db_path)
    con.execute("PRAGMA journal_mode = WAL")
    con.execute("""
        CREATE TABLE IF NOT EXISTS search_index (
            name       TEXT PRIMARY KEY,
            card_id    TEXT NOT NULL,
            thumb      TEXT NOT NULL DEFAULT '',
            indexed_at REAL NOT NULL
        )
    """)
    con.execute("CREATE INDEX IF NOT EXISTS idx_search_name ON search_index(name)")
    con.commit()
    con.close()


def load_existing_thumbs(db_path: str) -> dict[str, str]:
    import json
    thumbs: dict[str, str] = {}
    try:
        con = sqlite3.connect(db_path)
        rows = con.execute("SELECT id, data FROM card_cache").fetchall()
        con.close()
        for row_id, data_str in rows:
            if not row_id.startswith("dmwiki_"):
                continue
            name = row_id[7:]
            try:
                data = json.loads(data_str)
                thumb = str(data.get("img") or data.get("thumb") or data.get("imageUrl") or "").strip()
                if thumb:
                    thumbs[name] = thumb
            except Exception:
                pass
    except Exception as e:
        print(f"[warn] card_cache 読み込み失敗: {e}", file=sys.stderr)
    return thumbs


def build_index(db_path: str, delay: float = 0.5) -> None:
    print(f"[db] {db_path}", flush=True)
    init_search_index(db_path)

    names = fetch_all_card_names(delay=delay)
    if not names:
        print("[!] カード名が0件です。終了します。", file=sys.stderr)
        return

    print(f"[2/3] 既存キャッシュからサムネイルを照合中...", flush=True)
    thumbs = load_existing_thumbs(db_path)
    print(f"    → {len(thumbs)} 件のサムネイルをキャッシュから取得", flush=True)

    print(f"[3/3] search_index に {len(names)} 件を書き込み中...", flush=True)
    now = time.time()
    con = sqlite3.connect(db_path)
    inserted = 0
    for name in names:
        card_id = f"dmwiki_{name}"
        thumb = thumbs.get(name, "")
        con.execute(
            "INSERT OR IGNORE INTO search_index (name, card_id, thumb, indexed_at) VALUES (?, ?, ?, ?)",
            (name, card_id, thumb, now)
        )
        inserted += 1
    con.commit()
    con.close()

    print(f"\n完了: {inserted} 件登録", flush=True)
    print(f"次のステップ: git add dm_cache.db && git commit -m 'build: カード検索インデックス更新'", flush=True)


def main():
    parser = argparse.ArgumentParser(description="DM カード検索インデックスをビルドする")
    parser.add_argument("--db", default=DEFAULT_DB, help="SQLite DB パス")
    parser.add_argument("--delay", type=float, default=0.5, help="リクエスト間隔(秒)")
    args = parser.parse_args()
    build_index(args.db, args.delay)


if __name__ == "__main__":
    main()
