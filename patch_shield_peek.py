#!/usr/bin/env python3
import sys
path = r"C:\Users\user\OneDrive\デスクトップ\VM\dm-solitaire.html"
with open(path, encoding="utf-8") as f:
    src = f.read()

# ── 1. HTML: n枚ボタン群をリボンに追加 ────────────────────────────────────
OLD1 = '      <button id="btn-opp-grave" class="btn btn-gray" onclick="showOppGraveModal()">相手墓地 (<span id="hdr-opp-grave">0</span>)</button>\n      <div class="turn-pill">'
NEW1 = '      <button id="btn-opp-grave" class="btn btn-gray" onclick="showOppGraveModal()">相手墓地 (<span id="hdr-opp-grave">0</span>)</button>\n      <span style="display:inline-flex;align-items:center;gap:4px;border-left:1px solid var(--border);padding-left:8px;">\n        <input type="number" id="deck-n" value="3" min="1" max="40" style="width:46px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:4px 6px;border-radius:6px;font-size:0.82rem;">\n        <button class="btn btn-gray" onclick="showPeekModal(getDeckN(),false,false)">山上N確認</button>\n        <button class="btn btn-gray" onclick="showPeekModal(getDeckN(),false,true)">山上N表向き</button>\n        <button id="btn-opp-peek" class="btn btn-gray" onclick="showPeekModal(getDeckN(),true,false)">相手山上N確認</button>\n      </span>\n      <div class="turn-pill">'

# ── 2. JS startGame: oppElsにbtn-opp-peek追加 ─────────────────────────────
OLD2 = "  const oppEls = ['opp-area', 'vs-divider', 'btn-opp-draw', 'btn-opp-grave'];"
NEW2 = "  const oppEls = ['opp-area', 'vs-divider', 'btn-opp-draw', 'btn-opp-grave', 'btn-opp-peek'];"

# ── 3. JS renderShields: faceUp対応 ──────────────────────────────────────
OLD3 = """function renderShields() {
  const el = document.getElementById('shieldZone');
  el.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    if (i < G.shields.length) {
      const d = document.createElement('div');
      d.className = 'gc';
      d.innerHTML = '<div class="gc-back">DM</div>';
      d.title = 'シールド（右クリック/クリックでアクション）';
      d.addEventListener('click', e => showCtxShield(e, i));
      d.addEventListener('contextmenu', e => { e.preventDefault(); showCtxShield(e, i); });
      el.appendChild(d);
    } else {
      const s = document.createElement('div');
      s.className = 'shield-slot';
      s.textContent = '空';
      el.appendChild(s);
    }
  }
}"""
NEW3 = """function renderShields() {
  const el = document.getElementById('shieldZone');
  el.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    if (i < G.shields.length) {
      const sc = G.shields[i];
      const d = document.createElement('div');
      d.className = 'gc';
      if (sc.faceUp) {
        const civ = CIV[sc.civ] || CIV.fire;
        const face = document.createElement('div');
        face.className = 'gc-face';
        face.style.borderColor = civ.color;
        if (sc.img) { const img = document.createElement('img'); img.className = 'gc-art'; img.src = sc.img; img.alt = sc.name; img.onerror = () => img.replaceWith(makePh(sc)); face.appendChild(img); }
        else face.appendChild(makePh(sc));
        d.appendChild(face);
        d.title = sc.name;
      } else {
        d.innerHTML = '<div class="gc-back">DM</div>';
        d.title = 'シールド（右クリック/クリックでアクション）';
      }
      d.addEventListener('click', e => showCtxShield(e, i));
      d.addEventListener('contextmenu', e => { e.preventDefault(); showCtxShield(e, i); });
      el.appendChild(d);
    } else {
      const s = document.createElement('div');
      s.className = 'shield-slot';
      s.textContent = '空';
      el.appendChild(s);
    }
  }
}"""

# ── 4. JS renderOppShields: faceUp対応 ───────────────────────────────────
OLD4 = """function renderOppShields() {
  const el = document.getElementById('oppShieldZone');
  el.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    if (i < G.opp.shields.length) {
      const d = document.createElement('div');
      d.className = 'gc';
      d.innerHTML = '<div class="gc-back">DM</div>';
      d.title = '相手シールド（右クリックでアクション）';
      d.addEventListener('click', e => showCtxOppShield(e, i));
      d.addEventListener('contextmenu', e => { e.preventDefault(); showCtxOppShield(e, i); });
      el.appendChild(d);
    } else {
      const s = document.createElement('div');
      s.className = 'shield-slot';
      s.textContent = '空';
      el.appendChild(s);
    }
  }
}"""
NEW4 = """function renderOppShields() {
  const el = document.getElementById('oppShieldZone');
  el.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    if (i < G.opp.shields.length) {
      const sc = G.opp.shields[i];
      const d = document.createElement('div');
      d.className = 'gc';
      if (sc.faceUp) {
        const civ = CIV[sc.civ] || CIV.fire;
        const face = document.createElement('div');
        face.className = 'gc-face';
        face.style.borderColor = civ.color;
        if (sc.img) { const img = document.createElement('img'); img.className = 'gc-art'; img.src = sc.img; img.alt = sc.name; img.onerror = () => img.replaceWith(makePh(sc)); face.appendChild(img); }
        else face.appendChild(makePh(sc));
        d.appendChild(face);
        d.title = sc.name;
      } else {
        d.innerHTML = '<div class="gc-back">DM</div>';
        d.title = '相手シールド（右クリックでアクション）';
      }
      d.addEventListener('click', e => showCtxOppShield(e, i));
      d.addEventListener('contextmenu', e => { e.preventDefault(); showCtxOppShield(e, i); });
      el.appendChild(d);
    } else {
      const s = document.createElement('div');
      s.className = 'shield-slot';
      s.textContent = '空';
      el.appendChild(s);
    }
  }
}"""

# ── 5. showCtxShield: 表向き/裏向きトグル追加 ─────────────────────────────
OLD5 = """    { label: '墓地へ', fn: () => move('shields', 'graveyard', iid), red: true },
    { sep: true },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'shields', false) },
  ]);
}

function showCtxCard"""
NEW5 = """    { label: '墓地へ', fn: () => move('shields', 'graveyard', iid), red: true },
    { sep: true },
    { label: c.faceUp ? '裏向きにする' : '表向きにする', fn: () => { G.shields[idx].faceUp = !G.shields[idx].faceUp; render(); } },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'shields', false) },
  ]);
}

function showCtxCard"""

# ── 6. showCtxOppShield: 表向き/裏向きトグル追加 ──────────────────────────
OLD6 = """    { label: '相手墓地へ', fn: () => moveOpp('oppShields', 'oppGraveyard', iid), red: true },
    { sep: true },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'oppShields', true) },
  ]);
}

function showCtxOppCard"""
NEW6 = """    { label: '相手墓地へ', fn: () => moveOpp('oppShields', 'oppGraveyard', iid), red: true },
    { sep: true },
    { label: c.faceUp ? '裏向きにする' : '表向きにする', fn: () => { G.opp.shields[idx].faceUp = !G.opp.shields[idx].faceUp; render(); } },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'oppShields', true) },
  ]);
}

function showCtxOppCard"""

# ── 7. 新関数: getDeckN + showPeekModal（shuffleDeck直前に挿入）────────────
OLD7 = "function shuffleDeck() {"
NEW7 = """function getDeckN() {
  return Math.max(1, Math.min(40, parseInt(document.getElementById('deck-n')?.value) || 3));
}

function showPeekModal(n, isOpp, isReveal) {
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
}

function shuffleDeck() {"""

replacements = [
    ("HTML ribbon n枚ボタン", OLD1, NEW1),
    ("startGame oppEls", OLD2, NEW2),
    ("renderShields faceUp", OLD3, NEW3),
    ("renderOppShields faceUp", OLD4, NEW4),
    ("showCtxShield toggle", OLD5, NEW5),
    ("showCtxOppShield toggle", OLD6, NEW6),
    ("getDeckN + showPeekModal", OLD7, NEW7),
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
print(f"\nDone. {len(replacements)} changes applied.")
