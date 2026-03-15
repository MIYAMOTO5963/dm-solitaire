#!/usr/bin/env python3
import sys
path = r"C:\Users\user\OneDrive\デスクトップ\VM\dm-solitaire.html"
with open(path, encoding="utf-8") as f:
    src = f.read()

# ── 1. CSS: revealed-zone styles ─────────────────────────────────────────
OLD1 = ".board.vs-board .card-stack { flex: 1 1 64px; min-width: 38px; max-width: 86px; }\n</style>"
NEW1 = """.board.vs-board .card-stack { flex: 1 1 64px; min-width: 38px; max-width: 86px; }

/* ─── Revealed zone ─── */
.revealed-zone {
  background: var(--surface);
  border: 2px solid #f97316;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.rz-hd {
  font-size: 0.82rem;
  font-weight: 700;
  color: #f97316;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rz-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: var(--surface2);
  border-radius: 6px;
  padding: 5px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color .15s;
}
.rz-card:hover { border-color: #f97316; }
.board.vs-board .rz-card img { width: 38px; height: 53px; }
</style>"""

# ── 2. HTML: revealed-zone div after under-mode-banner ────────────────────
OLD2 = '    <div id="under-mode-banner" class="under-mode-banner" style="display:none;">'
NEW2 = """    <div id="revealed-zone" class="revealed-zone" style="display:none;">
      <div class="rz-hd">
        <span id="revealed-hd">公開中</span>
        <span style="font-size:0.72rem;font-weight:400;color:var(--text-dim);">— 全カードを処理してください</span>
      </div>
      <div id="revealed-cards-area"></div>
    </div>
    <div id="under-mode-banner" class="under-mode-banner" style="display:none;">"""

# ── 3. G init: add revealedCards/From/Label ───────────────────────────────
OLD3 = "  underMode: null,\n};"
NEW3 = "  underMode: null,\n  revealedCards: [], revealedFrom: null, revealedLabel: '',\n};"

# ── 4. startGame: reset revealed state ────────────────────────────────────
OLD4 = "  const banner = document.getElementById('under-mode-banner'); if (banner) banner.style.display = 'none';"
NEW4 = "  const banner = document.getElementById('under-mode-banner'); if (banner) banner.style.display = 'none';\n  G.revealedCards = []; G.revealedFrom = null; G.revealedLabel = '';"

# ── 5. render(): call renderRevealedZone at end ───────────────────────────
OLD5 = "  // 相手墓地サムネ\n  const oppGraveThumb"
NEW5 = "  renderRevealedZone();\n  // 相手墓地サムネ\n  const oppGraveThumb"

# ── 6. Ribbon: change onclick to startReveal ──────────────────────────────
OLD6a = "showPeekModal(getDeckN(),false,false)"
NEW6a = "startReveal(getDeckN(),false,false)"
OLD6b = "showPeekModal(getDeckN(),false,true)"
NEW6b = "startReveal(getDeckN(),false,true)"
OLD6c = "showPeekModal(getDeckN(),true,false)"
NEW6c = "startReveal(getDeckN(),true,false)"

# ── 7. Replace showPeekModal with new implementation ─────────────────────
OLD7 = """function showPeekModal(n, isOpp, isReveal) {
  const deck = isOpp ? G.opp.deck : G.deck;
  if (!deck.length) { toast((isOpp ? '相手' : '') + 'デッキが空です'); return; }
  const actual = Math.min(n, deck.length);
  const cards = [...deck].reverse().slice(0, actual);
  const pre = isOpp ? '相手' : '';
  const modeLabel = isReveal ? '表向き公開' : '確認';
  document.getElementById('modal-title').textContent = pre + 'デッキ上から' + actual + '枚' + modeLabel;
  document.getElementById('modal-body').innerHTML =
    '<div style="display:flex;flex-direction:column;gap:6px;">'
    + cards.map((c, i) => {
      const civ = CIV[c.civ] || CIV.fire;
      const pos = i === 0 ? 'トップ' : (i + 1) + '枚目';
      const iidE = esc(c.iid);
      const nb = 'showPeekModal(' + n + ',' + isOpp + ',' + isReveal + ')';
      const acts = isOpp
        ? '<button class="btn btn-gray btn-xs" onclick="moveOpp(\'oppDeck\',\'oppHand\',\'' + iidE + '\');' + nb + '">手札</button>'
          + '<button class="btn btn-gray btn-xs" onclick="moveOpp(\'oppDeck\',\'oppBattleZone\',\'' + iidE + '\');' + nb + '">BZ</button>'
          + '<button class="btn btn-gray btn-xs" onclick="moveOpp(\'oppDeck\',\'oppManaZone\',\'' + iidE + '\');' + nb + '">マナ</button>'
          + '<button class="btn btn-gray btn-xs" onclick="moveOpp(\'oppDeck\',\'oppShields\',\'' + iidE + '\');' + nb + '">シールド</button>'
          + '<button class="btn btn-gray btn-xs" onclick="moveOpp(\'oppDeck\',\'oppGraveyard\',\'' + iidE + '\');' + nb + '">墓地</button>'
        : '<button class="btn btn-gray btn-xs" onclick="move(\'deck\',\'hand\',\'' + iidE + '\');' + nb + '">手札</button>'
          + '<button class="btn btn-gray btn-xs" onclick="move(\'deck\',\'battleZone\',\'' + iidE + '\');' + nb + '">BZ</button>'
          + '<button class="btn btn-gray btn-xs" onclick="move(\'deck\',\'manaZone\',\'' + iidE + '\');' + nb + '">マナ</button>'
          + '<button class="btn btn-gray btn-xs" onclick="move(\'deck\',\'shields\',\'' + iidE + '\');' + nb + '">シールド</button>'
          + '<button class="btn btn-gray btn-xs" onclick="move(\'deck\',\'graveyard\',\'' + iidE + '\');' + nb + '">墓地</button>';
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px;background:var(--surface2);border-radius:6px;">'
        + '<div style="font-size:0.7rem;color:var(--text-dim);width:38px;flex-shrink:0;text-align:center;">' + pos + '</div>'
        + '<div style="width:44px;height:62px;border-radius:5px;overflow:hidden;flex-shrink:0;background:' + civ.color + ';">'
        + (c.img ? '<img src="' + esc(c.img) + '" style="width:100%;height:100%;object-fit:cover;">' : '') + '</div>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:0.82rem;font-weight:600;margin-bottom:4px;">' + esc(c.name) + '</div>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;">' + acts + '</div>'
        + '</div></div>';
    }).join('')
    + '</div>'
    + '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">'
    + '<button class="btn btn-gray btn-sm" onclick="' + (isOpp ? 'shuffleOppDeck' : 'shuffleDeck') + '()">シャッフルして閉じる</button>'
    + '</div>';
  openModal();
}"""

NEW7 = """function startReveal(n, isOpp, isReveal) {
  if (G.revealedCards.length) { toast('公開中のカードを先に処理してください'); return; }
  const deck = isOpp ? G.opp.deck : G.deck;
  if (!deck.length) { toast((isOpp ? '相手' : '') + 'デッキが空です'); return; }
  const actual = Math.min(n, deck.length);
  // top N cards from deck (deck[length-1] = top)
  G.revealedCards = deck.splice(deck.length - actual, actual).reverse();
  G.revealedFrom = isOpp ? 'oppDeck' : 'deck';
  G.revealedLabel = isReveal ? '表向き公開' : '確認中';
  render();
}

function renderRevealedZone() {
  const el = document.getElementById('revealed-zone');
  if (!el) return;
  if (!G.revealedCards || !G.revealedCards.length) { el.style.display = 'none'; return; }
  el.style.display = '';
  const isOpp = G.revealedFrom === 'oppDeck';
  const zoneOpts = (isOpp ? _STACK_ZONES_OPP : _STACK_ZONES_PLR)
    .map(z => '<option value="' + z.val + '">' + z.label + '</option>').join('');
  const backZone = isOpp ? 'oppDeck_top' : 'deck_top';
  document.getElementById('revealed-hd').textContent =
    G.revealedLabel + ' ' + G.revealedCards.length + '枚（' + (isOpp ? '相手' : '自分') + 'デッキから）';
  document.getElementById('revealed-cards-area').innerHTML =
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">'
    + G.revealedCards.map((c, i) => {
      const civ = CIV[c.civ] || CIV.fire;
      const pos = i === 0 ? 'トップ' : (i + 1) + '枚目';
      return '<div class="rz-card" onclick="revealedCardClick(event,\'' + esc(c.iid) + '\')" oncontextmenu="revealedCardCtx(event,\'' + esc(c.iid) + '\');event.preventDefault()">'
        + '<input type="checkbox" class="rev-cb" data-iid="' + esc(c.iid) + '" style="width:14px;height:14px;" onclick="event.stopPropagation()">'
        + '<div style="width:52px;height:73px;border-radius:5px;overflow:hidden;background:' + civ.color + ';flex-shrink:0;">'
        + (c.img ? '<img src="' + esc(c.img) + '" style="width:100%;height:100%;object-fit:cover;">' : '') + '</div>'
        + '<div style="font-size:0.6rem;text-align:center;width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-dim);">' + pos + '</div>'
        + '<div style="font-size:0.65rem;text-align:center;width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.name) + '</div>'
        + '</div>';
    }).join('')
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--border);">'
    + '<label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;cursor:pointer;white-space:nowrap;">'
    + '<input type="checkbox" id="rev-all-cb" style="width:14px;height:14px;" onchange="document.querySelectorAll(\'.rev-cb\').forEach(cb=>cb.checked=this.checked)">全選択</label>'
    + '<select id="rev-dest" style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:6px;font-size:0.82rem;">' + zoneOpts + '</select>'
    + '<button class="btn btn-orange btn-sm" onclick="moveSelectedRevealed()">移動</button>'
    + '<button class="btn btn-gray btn-sm" onclick="returnAllRevealed(\'' + backZone + '\')">全部デッキに戻す</button>'
    + '</div>';
}

function revealedCardClick(e, iid) {
  const cb = e.currentTarget.querySelector('.rev-cb');
  if (cb && e.target !== cb) cb.checked = !cb.checked;
}

function revealedCardCtx(e, iid) {
  const c = G.revealedCards.find(x => x.iid === iid);
  if (!c) return;
  const isOpp = G.revealedFrom === 'oppDeck';
  const zones = isOpp ? _STACK_ZONES_OPP : _STACK_ZONES_PLR;
  openCtx(e, zones.map(z => ({ label: z.label + 'へ', fn: () => moveFromRevealed(iid, z.val) })));
}

function _applyRevealedCard(card, destZone) {
  card.tapped = false;
  if      (destZone === 'hand')           G.hand.push(card);
  else if (destZone === 'battleZone')     G.battleZone.push(card);
  else if (destZone === 'manaZone')       G.manaZone.push(card);
  else if (destZone === 'shields')        G.shields.push(card);
  else if (destZone === 'deck_top')       G.deck.push(card);
  else if (destZone === 'deck_bottom')    G.deck.unshift(card);
  else if (destZone === 'graveyard')      G.graveyard.push(card);
  else if (destZone === 'oppHand')        G.opp.hand.push(card);
  else if (destZone === 'oppBattleZone')  G.opp.battleZone.push(card);
  else if (destZone === 'oppManaZone')    G.opp.manaZone.push(card);
  else if (destZone === 'oppShields')     G.opp.shields.push(card);
  else if (destZone === 'oppDeck_top')    G.opp.deck.push(card);
  else if (destZone === 'oppDeck_bottom') G.opp.deck.unshift(card);
  else if (destZone === 'oppGraveyard')   G.opp.graveyard.push(card);
}

function moveFromRevealed(iid, destZone) {
  const idx = G.revealedCards.findIndex(c => c.iid === iid);
  if (idx < 0) return;
  const [card] = G.revealedCards.splice(idx, 1);
  _applyRevealedCard(card, destZone);
  const allZ = [..._STACK_ZONES_PLR, ..._STACK_ZONES_OPP];
  log('「' + card.name + '」を' + G.revealedLabel + 'から' + (allZ.find(z => z.val === destZone)?.label || destZone) + 'へ');
  render();
}

function moveSelectedRevealed() {
  const dest = document.getElementById('rev-dest')?.value;
  const iids = [...document.querySelectorAll('.rev-cb:checked')].map(cb => cb.dataset.iid);
  if (!iids.length) { toast('カードを選択してください'); return; }
  const allZ = [..._STACK_ZONES_PLR, ..._STACK_ZONES_OPP];
  const label = allZ.find(z => z.val === dest)?.label || dest;
  iids.forEach(iid => {
    const idx = G.revealedCards.findIndex(c => c.iid === iid);
    if (idx < 0) return;
    const [card] = G.revealedCards.splice(idx, 1);
    _applyRevealedCard(card, dest);
    log('「' + card.name + '」を' + G.revealedLabel + 'から' + label + 'へ');
  });
  render();
}

function returnAllRevealed(destZone) {
  // 元の順序でデッキに戻す（逆順でpushするとトップが先頭に来る）
  [...G.revealedCards].reverse().forEach(c => _applyRevealedCard(c, destZone));
  G.revealedCards = [];
  log(G.revealedLabel + 'のカードをデッキに戻しました');
  render();
}"""

replacements = [
    ("CSS revealed-zone", OLD1, NEW1),
    ("HTML revealed-zone div", OLD2, NEW2),
    ("G init revealedCards", OLD3, NEW3),
    ("startGame reset revealed", OLD4, NEW4),
    ("render() call renderRevealedZone", OLD5, NEW5),
    ("ribbon startReveal false false", OLD6a, NEW6a),
    ("ribbon startReveal false true", OLD6b, NEW6b),
    ("ribbon startReveal true false", OLD6c, NEW6c),
    ("replace showPeekModal", OLD7, NEW7),
]

errors = []
for name, old, new in replacements:
    count = src.count(old)
    if count == 0:
        errors.append(f"NOT FOUND: {name}")
    elif count > 1:
        errors.append(f"AMBIGUOUS ({count}x): {name}")
    else:
        src = src.replace(old, new)
        print(f"OK: {name}")

if errors:
    print("\nERRORS:")
    for e in errors: print(" ", e)
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)
print(f"\nDone. {len(replacements)} changes applied.")
