#!/usr/bin/env python3
# patch_under.py — implements card-stack / 下に入れる feature
import sys

path = r"C:\Users\user\OneDrive\デスクトップ\VM\dm-solitaire.html"
with open(path, encoding="utf-8") as f:
    src = f.read()

orig = src

# ── 1. CSS: card-stack styles ──────────────────────────────────────────────
OLD1 = ".board.vs-board .btn-xs { padding: 1px 6px; font-size: 0.65rem; }\n</style>"
NEW1 = """.board.vs-board .btn-xs { padding: 1px 6px; font-size: 0.65rem; }

/* ─── Card Stack (under) ─── */
.card-stack { position: relative; flex: 1 1 115px; min-width: 70px; max-width: 155px; }
.card-stack > .gc { flex: none; min-width: unset; max-width: unset; width: 100%; position: relative; z-index: 2; }
.card-under-peek { position: absolute; top: 4px; aspect-ratio: 5/7; border-radius: 7px;
  overflow: hidden; border: 2px solid rgba(255,255,255,.35); background: #1e3a5f; }
.card-under-peek img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gc.under-target { outline: 3px solid #f97316; outline-offset: 3px; cursor: crosshair !important; }
.card-stack .gc.under-target { outline: 3px solid #f97316; }
.under-mode-banner {
  background: linear-gradient(90deg,#f97316,#ea580c); color:#fff; padding:8px 14px;
  border-radius:8px; margin-bottom:8px; display:flex; align-items:center;
  justify-content:space-between; font-size:0.85rem; font-weight:600;
}
.board.vs-board .card-stack { flex: 1 1 64px; min-width: 38px; max-width: 86px; }
</style>"""

# ── 2. HTML: under-mode-banner before .board ──────────────────────────────
OLD2 = '    <div class="board">'
NEW2 = """    <div id="under-mode-banner" class="under-mode-banner" style="display:none;">
      <span id="under-mode-text">カードを選択中...</span>
      <button class="btn btn-gray btn-sm" onclick="cancelUnderMode()">キャンセル</button>
    </div>
    <div class="board">"""

# ── 3. JS: render() — pass useStack=true for battle zones ─────────────────
OLD3 = "  renderZone('battleZone', G.battleZone, 'battle');"
NEW3 = "  renderZone('battleZone', G.battleZone, 'battle', true);"

OLD3b = "  renderOppZone('oppBattleZone', G.opp.battleZone, 'opp-battle');"
NEW3b = "  renderOppZone('oppBattleZone', G.opp.battleZone, 'opp-battle', true);"

# ── 4. JS: renderZone with useStack ───────────────────────────────────────
OLD4 = """function renderZone(elId, cards, zone) {
  const el = document.getElementById(elId);
  if (!cards.length) { el.innerHTML = '<div class="zone-empty">空</div>'; return; }
  el.innerHTML = '';
  cards.forEach(c => el.appendChild(makeCard(c, zone)));
}"""
NEW4 = """function renderZone(elId, cards, zone, useStack = false) {
  const el = document.getElementById(elId);
  if (!cards.length) { el.innerHTML = '<div class="zone-empty">空</div>'; return; }
  el.innerHTML = '';
  cards.forEach(c => el.appendChild(useStack ? makeCardStack(c, zone) : makeCard(c, zone)));
}"""

# ── 5. JS: renderOppZone with useStack ────────────────────────────────────
OLD5 = """function renderOppZone(elId, cards, zone) {
  const el = document.getElementById(elId);
  if (!cards.length) { el.innerHTML = '<div class="zone-empty">空</div>'; return; }
  el.innerHTML = '';
  cards.forEach(c => {
    const d = makeCard(c, zone);
    el.appendChild(d);
  });
}"""
NEW5 = """function renderOppZone(elId, cards, zone, useStack = false) {
  const el = document.getElementById(elId);
  if (!cards.length) { el.innerHTML = '<div class="zone-empty">空</div>'; return; }
  el.innerHTML = '';
  cards.forEach(c => {
    const d = useStack ? makeCardStack(c, zone) : makeCard(c, zone);
    el.appendChild(d);
  });
}"""

# ── 6. JS: makeCard — add under mode click handling ───────────────────────
OLD6 = """  d.addEventListener('click', e => {
    if (zone === 'hand') showCtxCard(e, c, zone);
    else if (zone === 'battle') tapToggle('battleZone', c.iid);
    else if (zone === 'mana') tapToggle('manaZone', c.iid);
    else if (zone === 'opp-battle') tapToggleOpp('oppBattleZone', c.iid);
    else if (zone === 'opp-mana') tapToggleOpp('oppManaZone', c.iid);
    else showCtxOppCard(e, c, zone);
  });"""
NEW6 = """  d.addEventListener('click', e => {
    if (G.underMode && (zone === 'battle' || zone === 'opp-battle')) {
      placeUnder(c, zone === 'opp-battle' ? 'oppBattleZone' : 'battleZone');
      return;
    }
    if (zone === 'hand') showCtxCard(e, c, zone);
    else if (zone === 'battle') {
      if (c.under && c.under.length) showStackModal(c, 'battleZone');
      else tapToggle('battleZone', c.iid);
    }
    else if (zone === 'mana') tapToggle('manaZone', c.iid);
    else if (zone === 'opp-battle') {
      if (c.under && c.under.length) showStackModal(c, 'oppBattleZone');
      else tapToggleOpp('oppBattleZone', c.iid);
    }
    else if (zone === 'opp-mana') tapToggleOpp('oppManaZone', c.iid);
    else showCtxOppCard(e, c, zone);
  });
  if (G.underMode && (zone === 'battle' || zone === 'opp-battle')) d.classList.add('under-target');"""

# ── 7. JS: new functions — insert after makeCard ─────────────────────────
NEW_FUNCS = """
// ─── Card Stack ────────────────────────────────────────────────────────────

function makeCardStack(c, zone) {
  if (!c.under || !c.under.length) return makeCard(c, zone);
  const PEEK = document.querySelector('.board.vs-board') ? 13 : 20;
  const stack = document.createElement('div');
  stack.className = 'card-stack';
  stack.style.marginLeft = (c.under.length * PEEK) + 'px';
  [...c.under].reverse().forEach((uc, i) => {
    const peek = document.createElement('div');
    peek.className = 'card-under-peek';
    const leftPx = (c.under.length - i) * PEEK;
    peek.style.cssText = 'left:-' + leftPx + 'px;top:4px;width:100%;position:absolute;z-index:' + i + ';';
    peek.title = uc.name;
    if (uc.img) {
      const img = document.createElement('img');
      img.src = uc.img;
      img.alt = uc.name;
      peek.appendChild(img);
    }
    stack.appendChild(peek);
  });
  const mainCard = makeCard(c, zone);
  stack.appendChild(mainCard);
  return stack;
}

function enterUnderMode(card, fromZone, isOpp) {
  if (!card) return;
  G.underMode = { card, fromZone, isOpp: !!isOpp };
  document.getElementById('under-mode-banner').style.display = 'flex';
  document.getElementById('under-mode-text').textContent =
    '「' + card.name + '」を下に入れる — 場のカードをクリック';
  closeCtx();
  render();
}

function cancelUnderMode() {
  G.underMode = null;
  document.getElementById('under-mode-banner').style.display = 'none';
  render();
}

function placeUnder(targetCard, targetZone) {
  if (!G.underMode) return;
  const { card, fromZone, isOpp } = G.underMode;
  if (card.iid === targetCard.iid) { cancelUnderMode(); return; }
  const srcArr = isOpp ? getOppZone(fromZone) : getZone(fromZone);
  const idx = srcArr.findIndex(c => c.iid === card.iid);
  if (idx >= 0) srcArr.splice(idx, 1);
  if (!targetCard.under) targetCard.under = [];
  targetCard.under.unshift(card);
  log('「' + card.name + '」→「' + targetCard.name + '」の下に入れた');
  G.underMode = null;
  document.getElementById('under-mode-banner').style.display = 'none';
  render();
}

function showStackModal(topCard, zone) {
  const isOpp = zone === 'oppBattleZone';
  document.getElementById('modal-title').textContent = topCard.name + ' (スタック)';
  const all = [topCard, ...(topCard.under || [])];
  document.getElementById('modal-body').innerHTML = `
    <p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px;">一番上が本体。下のカードをクリックで手札に戻せます。</p>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${all.map((c, i) => {
        const civ = CIV[c.civ] || CIV.fire;
        const isTop = i === 0;
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px;background:var(--surface2);border-radius:6px;">'
          + '<div style="width:52px;height:73px;border-radius:5px;overflow:hidden;flex-shrink:0;background:' + civ.color + ';">'
          + (c.img ? '<img src="' + esc(c.img) + '" style="width:100%;height:100%;object-fit:cover;">' : '')
          + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="font-size:0.82rem;font-weight:600;">' + esc(c.name) + '</div>'
          + '<div style="font-size:0.72rem;color:var(--text-dim);">' + (isTop ? '本体（一番上）' : i + '枚下') + '</div>'
          + '</div>'
          + (!isTop ? '<button class="btn btn-gray btn-sm" onclick="takeFromUnder(\'' + esc(topCard.iid) + '\',\'' + esc(c.iid) + '\',\'' + zone + '\')">手札へ</button>' : '')
          + '</div>';
      }).join('')}
    </div>`;
  openModal();
}

function takeFromUnder(parentIid, childIid, zone) {
  const arr = zone === 'oppBattleZone' ? G.opp.battleZone : G.battleZone;
  const parent = arr.find(c => c.iid === parentIid);
  if (!parent || !parent.under) return;
  const idx = parent.under.findIndex(c => c.iid === childIid);
  if (idx < 0) return;
  const [child] = parent.under.splice(idx, 1);
  if (zone === 'oppBattleZone') G.opp.hand.push(child);
  else G.hand.push(child);
  log('「' + child.name + '」をスタックから手札へ');
  closeModal();
  render();
}

"""

OLD7_ANCHOR = "// ─── Opponent rendering ──────────────────────────────────────────────────────"
NEW7 = NEW_FUNCS + OLD7_ANCHOR

# ── 8. G.underMode init in startGame ─────────────────────────────────────
OLD8 = "  G.vsMode = vsMode;\n  G.currentPlayer = 1;"
NEW8 = "  G.vsMode = vsMode;\n  G.currentPlayer = 1;\n  G.underMode = null;\n  const banner = document.getElementById('under-mode-banner'); if (banner) banner.style.display = 'none';"

# ── 9. showCtxShield: add 下に入れる ──────────────────────────────────────
OLD9 = """    { label: '墓地へ', fn: () => move('shields', 'graveyard', iid), red: true },
  ]);
}

function showCtxCard"""
NEW9 = """    { label: '墓地へ', fn: () => move('shields', 'graveyard', iid), red: true },
    { sep: true },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'shields', false) },
  ]);
}

function showCtxCard"""

# Need to expose `c` in showCtxShield — currently only `iid` is captured
# Actually looking at the code, `c` is `G.shields[idx]` so we already have it at line 1679
# The function sets `const iid = c.iid;` so c IS available. Good.

# ── 10. showCtxCard: add 下に入れる + スタックを確認 ──────────────────────
# For 'battle' zone, add stack confirm + under option
OLD10 = """  } else if (zone === 'battle') {
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（攻撃）', fn: () => tapToggle('battleZone', c.iid) });
    items.push({ label: '手札に戻す',                 fn: () => move('battleZone', 'hand', c.iid) });
    items.push({ label: 'マナゾーンへ',               fn: () => move('battleZone', 'manaZone', c.iid) });
    items.push({ label: 'シールドへ',                 fn: () => move('battleZone', 'shields', c.iid) });
    items.push({ label: 'デッキトップへ',             fn: () => move('battleZone', 'deck', c.iid, { top: true }) });
    items.push({ label: 'デッキボトムへ',             fn: () => move('battleZone', 'deck', c.iid, { bottom: true }) });
    items.push({ sep: true });
    items.push({ label: '破壊（墓地へ）', fn: () => move('battleZone', 'graveyard', c.iid), red: true });
  } else if (zone === 'mana') {"""
NEW10 = """  } else if (zone === 'battle') {
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（攻撃）', fn: () => tapToggle('battleZone', c.iid) });
    if (c.under && c.under.length) items.push({ label: 'スタックを確認', fn: () => showStackModal(c, 'battleZone') });
    items.push({ label: '手札に戻す',                 fn: () => move('battleZone', 'hand', c.iid) });
    items.push({ label: 'マナゾーンへ',               fn: () => move('battleZone', 'manaZone', c.iid) });
    items.push({ label: 'シールドへ',                 fn: () => move('battleZone', 'shields', c.iid) });
    items.push({ label: 'デッキトップへ',             fn: () => move('battleZone', 'deck', c.iid, { top: true }) });
    items.push({ label: 'デッキボトムへ',             fn: () => move('battleZone', 'deck', c.iid, { bottom: true }) });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'battleZone', false) });
    items.push({ sep: true });
    items.push({ label: '破壊（墓地へ）', fn: () => move('battleZone', 'graveyard', c.iid), red: true });
  } else if (zone === 'mana') {"""

# For hand zone, add 下に入れる
OLD10b = """    items.push({ label: '捨てる（墓地へ）', fn: () => move('hand', 'graveyard', c.iid), red: true });
  } else if (zone === 'battle') {"""
NEW10b = """    items.push({ label: '捨てる（墓地へ）', fn: () => move('hand', 'graveyard', c.iid), red: true });
    items.push({ sep: true });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'hand', false) });
  } else if (zone === 'battle') {"""

# ── 11. showCtxOppCard: add 下に入れる + スタックを確認 ───────────────────
OLD11 = """  } else if (zone === 'opp-battle') {
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（攻撃）', fn: () => tapToggleOpp('oppBattleZone', c.iid) });
    items.push({ label: '相手手札に戻す',                 fn: () => moveOpp('oppBattleZone', 'oppHand', c.iid) });
    items.push({ label: '相手マナゾーンへ',               fn: () => moveOpp('oppBattleZone', 'oppManaZone', c.iid) });
    items.push({ label: '相手シールドへ',                 fn: () => moveOpp('oppBattleZone', 'oppShields', c.iid) });
    items.push({ label: '相手デッキトップへ',             fn: () => moveOpp('oppBattleZone', 'oppDeck', c.iid, { top: true }) });
    items.push({ label: '相手デッキボトムへ',             fn: () => moveOpp('oppBattleZone', 'oppDeck', c.iid, { bottom: true }) });
    items.push({ sep: true });
    items.push({ label: '破壊（相手墓地へ）',             fn: () => moveOpp('oppBattleZone', 'oppGraveyard', c.iid), red: true });
  } else if (zone === 'opp-mana') {"""
NEW11 = """  } else if (zone === 'opp-battle') {
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（攻撃）', fn: () => tapToggleOpp('oppBattleZone', c.iid) });
    if (c.under && c.under.length) items.push({ label: 'スタックを確認', fn: () => showStackModal(c, 'oppBattleZone') });
    items.push({ label: '相手手札に戻す',                 fn: () => moveOpp('oppBattleZone', 'oppHand', c.iid) });
    items.push({ label: '相手マナゾーンへ',               fn: () => moveOpp('oppBattleZone', 'oppManaZone', c.iid) });
    items.push({ label: '相手シールドへ',                 fn: () => moveOpp('oppBattleZone', 'oppShields', c.iid) });
    items.push({ label: '相手デッキトップへ',             fn: () => moveOpp('oppBattleZone', 'oppDeck', c.iid, { top: true }) });
    items.push({ label: '相手デッキボトムへ',             fn: () => moveOpp('oppBattleZone', 'oppDeck', c.iid, { bottom: true }) });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'oppBattleZone', true) });
    items.push({ sep: true });
    items.push({ label: '破壊（相手墓地へ）',             fn: () => moveOpp('oppBattleZone', 'oppGraveyard', c.iid), red: true });
  } else if (zone === 'opp-mana') {"""

# opp-hand: add 下に入れる
OLD11b = """    items.push({ label: '捨てる（相手墓地へ）',           fn: () => moveOpp('oppHand', 'oppGraveyard', c.iid), red: true });
  } else if (zone === 'opp-battle') {"""
NEW11b = """    items.push({ label: '捨てる（相手墓地へ）',           fn: () => moveOpp('oppHand', 'oppGraveyard', c.iid), red: true });
    items.push({ sep: true });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'oppHand', true) });
  } else if (zone === 'opp-battle') {"""

# ── 12. showCtxOppShield: expose c and add 下に入れる ─────────────────────
OLD12 = """function showCtxOppShield(e, idx) {
  if (idx >= G.opp.shields.length) return;
  const iid = G.opp.shields[idx].iid;
  openCtx(e, ["""
NEW12 = """function showCtxOppShield(e, idx) {
  if (idx >= G.opp.shields.length) return;
  const c = G.opp.shields[idx];
  const iid = c.iid;
  openCtx(e, ["""

OLD12b = """    { label: '相手墓地へ', fn: () => moveOpp('oppShields', 'oppGraveyard', iid), red: true },
  ]);
}

function showCtxOppCard"""
NEW12b = """    { label: '相手墓地へ', fn: () => moveOpp('oppShields', 'oppGraveyard', iid), red: true },
    { sep: true },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'oppShields', true) },
  ]);
}

function showCtxOppCard"""

# ── 13. graveAct: add 下に入れる button ──────────────────────────────────
OLD13 = """        <button class="btn btn-gray" onclick="showCardDetail(G.graveyard.find(x=>x.iid==='${esc(iid)}') || G.hand[0])">カード詳細</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function shuffleDeck"""
NEW13 = """        <button class="btn btn-gray" onclick="showCardDetail(G.graveyard.find(x=>x.iid==='${esc(iid)}') || G.hand[0])">カード詳細</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.graveyard.find(x=>x.iid==='${esc(iid)}'),'graveyard',false)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function shuffleDeck"""

# ── 14. deckAct: add 下に入れる button ───────────────────────────────────
OLD14 = """        <button class="btn btn-gray" onclick="showCardDetail(G.deck.find(x=>x.iid==='${esc(iid)}'))">カード詳細</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function openModal"""
NEW14 = """        <button class="btn btn-gray" onclick="showCardDetail(G.deck.find(x=>x.iid==='${esc(iid)}'))">カード詳細</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.deck.find(x=>x.iid==='${esc(iid)}'),'deck',false)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function openModal"""

# ── 15. oppDeckAct: add 下に入れる button ────────────────────────────────
OLD15 = """        <button class="btn btn-gray" onclick="moveOpp('oppDeck','oppGraveyard','${esc(iid)}');showOppDeckModal()">墓地へ</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function showOppGraveModal"""
NEW15 = """        <button class="btn btn-gray" onclick="moveOpp('oppDeck','oppGraveyard','${esc(iid)}');showOppDeckModal()">墓地へ</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.opp.deck.find(x=>x.iid==='${esc(iid)}'),'oppDeck',true)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function showOppGraveModal"""

# ── 16. oppGraveAct: add 下に入れる button ───────────────────────────────
OLD16 = """        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppDeck','${esc(iid)}',{bottom:true});showOppGraveModal()">デッキボトムへ戻す</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function showDeckModal"""
NEW16 = """        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppDeck','${esc(iid)}',{bottom:true});showOppGraveModal()">デッキボトムへ戻す</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.opp.graveyard.find(x=>x.iid==='${esc(iid)}'),'oppGraveyard',true)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function showDeckModal"""

replacements = [
    ("CSS card-stack styles", OLD1, NEW1),
    ("HTML under-mode-banner", OLD2, NEW2),
    ("render() battleZone useStack", OLD3, NEW3),
    ("render() oppBattleZone useStack", OLD3b, NEW3b),
    ("renderZone useStack param", OLD4, NEW4),
    ("renderOppZone useStack param", OLD5, NEW5),
    ("makeCard click under mode", OLD6, NEW6),
    ("new stack functions", OLD7_ANCHOR, NEW7),
    # G.underMode init already applied manually
    ("showCtxShield 下に入れる", OLD9, NEW9),
    ("showCtxCard hand 下に入れる", OLD10b, NEW10b),
    ("showCtxCard battle stack+under", OLD10, NEW10),
    ("showCtxOppCard hand 下に入れる", OLD11b, NEW11b),
    ("showCtxOppCard battle stack+under", OLD11, NEW11),
    ("showCtxOppShield expose c", OLD12, NEW12),
    ("showCtxOppShield 下に入れる", OLD12b, NEW12b),
    ("graveAct 下に入れる", OLD13, NEW13),
    ("deckAct 下に入れる", OLD14, NEW14),
    ("oppDeckAct 下に入れる", OLD15, NEW15),
    ("oppGraveAct 下に入れる", OLD16, NEW16),
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
    for e in errors:
        print(" ", e)
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"\nDone. {len(replacements) - len(errors)} changes applied.")
