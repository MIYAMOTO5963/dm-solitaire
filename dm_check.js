
// ╔══════════════════════════════════════════════════════════╗
// ║  DATA                                                    ║
// ╚══════════════════════════════════════════════════════════╝
const CIV = {
  light:  { name: '光',   emoji: '☀',  color: '#eab308', fg: '#111' },
  water:  { name: '水',   emoji: '💧', color: '#3b82f6', fg: '#fff' },
  dark:   { name: '闇',  emoji: '🌑', color: '#a855f7', fg: '#fff' },
  fire:   { name: '火',   emoji: '🔥', color: '#ef4444', fg: '#fff' },
  nature: { name: '自然', emoji: '🌿', color: '#22c55e', fg: '#111' },
  multi:  { name: '多色', emoji: '✨', color: '#f97316', fg: '#111' },
};

// Deck builder state: [{card, count}]
let deckCards = [];
// Saved decks in localStorage
let savedDecks = {};
let _drag = { iid: null, zone: null };   // drag & drop state

// Game state
let G = {
  deck: [], hand: [], battleZone: [], manaZone: [], graveyard: [], shields: [],
  opp: { deck: [], hand: [], battleZone: [], manaZone: [], graveyard: [], shields: [] },
  turn: 0, uid: 0,
  vsMode: false, currentPlayer: 1, p1Name: 'プレイヤー1', p2Name: 'プレイヤー2',
  underMode: null,
  revealedCards: [], revealedFrom: null, revealedLabel: '',
};

// ╔══════════════════════════════════════════════════════════╗
// ║  NAVIGATION                                              ║
// ╚══════════════════════════════════════════════════════════╝
function switchPage(p) {
  ['deck','game'].forEach(id => {
    document.getElementById('page-' + id).classList.toggle('show', id === p);
    document.getElementById('tab-' + id).classList.toggle('active', id === p);
  });
}

function gotoGame() {
  const tot = deckCards.reduce((s, x) => s + x.count, 0);
  if (tot < 1) { toast('デッキが空です'); return; }
  switchPage('game');
  startGame();
}

// ╔══════════════════════════════════════════════════════════╗
// ║  DECK BUILDER                                            ║
// ╚══════════════════════════════════════════════════════════╝
function loadStorage() {
  try { savedDecks = JSON.parse(localStorage.getItem('dm_decks') || '{}'); } catch { savedDecks = {}; }
  refreshDeckSel();
}

function refreshDeckSel() {
  const sel = document.getElementById('deck-sel');
  const cur = sel.value;
  sel.innerHTML = '<option value="">── 新規デッキ ──</option>';
  Object.keys(savedDecks).forEach(n => {
    const o = document.createElement('option');
    o.value = o.textContent = n;
    sel.appendChild(o);
  });
  if (cur && savedDecks[cur]) sel.value = cur;

  // Also refresh opp deck selector
  const osel = document.getElementById('opp-deck-sel');
  if (osel) {
    const ocur = osel.value;
    osel.innerHTML = '<option value="">なし</option>';
    Object.keys(savedDecks).forEach(n => {
      const o = document.createElement('option');
      o.value = o.textContent = n;
      osel.appendChild(o);
    });
    if (ocur && savedDecks[ocur]) osel.value = ocur;
  }
}

function loadDeckSel() {
  const n = document.getElementById('deck-sel').value;
  document.getElementById('deck-name').value = n;
  if (!n || !savedDecks[n]) { deckCards = []; }
  else { deckCards = JSON.parse(JSON.stringify(savedDecks[n])); }
  renderDeck();
}

function saveDeck() {
  const n = document.getElementById('deck-name').value.trim();
  if (!n) { toast('デッキ名を入力してください'); return; }
  savedDecks[n] = JSON.parse(JSON.stringify(deckCards));
  localStorage.setItem('dm_decks', JSON.stringify(savedDecks));
  refreshDeckSel();
  document.getElementById('deck-sel').value = n;
  toast(`「${n}」を保存しました ✓`);
}

function deleteDeck() {
  const n = document.getElementById('deck-sel').value;
  if (!n) { toast('削除するデッキを選択してください'); return; }
  if (!confirm(`「${n}」を削除しますか？`)) return;
  delete savedDecks[n];
  localStorage.setItem('dm_decks', JSON.stringify(savedDecks));
  deckCards = [];
  document.getElementById('deck-name').value = '';
  refreshDeckSel();
  renderDeck();
  toast(`「${n}」を削除しました`);
}

function clearDeck() {
  if (deckCards.length > 0 && !confirm('デッキをクリアしますか？')) return;
  deckCards = [];
  renderDeck();
}

function duplicateDeck() {
  const n = document.getElementById('deck-sel').value;
  if (!n) { toast('複製するデッキを選択してください'); return; }
  let newN = n + ' (コピー)';
  let i = 2; while (savedDecks[newN]) newN = n + ` (コピー${i++})`;
  savedDecks[newN] = JSON.parse(JSON.stringify(savedDecks[n]));
  localStorage.setItem('dm_decks', JSON.stringify(savedDecks));
  refreshDeckSel();
  document.getElementById('deck-sel').value = newN;
  document.getElementById('deck-name').value = newN;
  deckCards = JSON.parse(JSON.stringify(savedDecks[newN]));
  renderDeck();
  toast(`「${newN}」として複製しました`);
}

function exportDeck() {
  const n = document.getElementById('deck-name').value.trim() || 'deck';
  const blob = new Blob([JSON.stringify({name: n, cards: deckCards}, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${n}.json`;
  a.click();
}

function importDeck() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        deckCards = d.cards || d;
        document.getElementById('deck-name').value = d.name || f.name.replace('.json', '');
        renderDeck();
        toast('インポートしました ✓');
      } catch { toast('読み込み失敗'); }
    };
    r.readAsText(f);
  };
  inp.click();
}

function addOne(name) {
  const idx = deckCards.findIndex(x => x.card.name === name);
  if (idx < 0) return;
  deckCards[idx].count++;
  renderDeck();
}

// ── Background image loader ──────────────────────────────────────────────────
let _imgLoadGen = 0;

function _startImgLoad() {
  const gen = ++_imgLoadGen;
  // Deduplicate: collect unique cards that need images
  const seen = new Set();
  const toFetch = [];
  deckCards.forEach(x => {
    if (!x.card.img && x.card.id && !seen.has(x.card.id)) {
      seen.add(x.card.id);
      toFetch.push(x.card);
    }
  });
  if (!toFetch.length) return;

  (async () => {
    for (const card of toFetch) {
      if (_imgLoadGen !== gen) return; // cancelled by a newer renderDeck

      // Serve from cache if we already have the detail
      const cached = _detailCache[card.id];
      if (cached?.img) {
        _applyImg(card.name, cached.img);
        continue;
      }
      try {
        const r = await fetch(`${PROXY}/detail?id=${encodeURIComponent(card.id)}`,
                              { signal: AbortSignal.timeout(25000) });
        if (_imgLoadGen !== gen) return;
        const c = await r.json();
        if (c.img) {
          _detailCache[card.id] = Object.assign(_detailCache[card.id] || {}, c);
          _applyImg(card.name, c.img);
        }
      } catch (_) {}
    }
  })();
}

function _applyImg(name, imgUrl) {
  // Update stored card objects
  deckCards.forEach(x => { if (x.card.name === name) x.card.img = imgUrl; });
  // Update DOM cells in-place (no full re-render needed)
  document.querySelectorAll(`#card-rows .dk-cell`).forEach(cell => {
    if (cell.dataset.cardName !== name) return;
    if (cell.querySelector('img')) return; // already has image
    const img = document.createElement('img');
    img.alt = name;
    img.onerror = () => img.style.display = 'none';
    img.src = imgUrl;
    cell.insertBefore(img, cell.firstChild);
  });
}

function removeOne(name) {
  const idx = deckCards.findIndex(x => x.card.name === name);
  if (idx < 0) return;
  deckCards[idx].count--;
  if (deckCards[idx].count <= 0) deckCards.splice(idx, 1);
  renderDeck();
}

function renderNameList() {
  const nl = document.getElementById('name-list');
  if (!nl) return;
  nl.innerHTML = '';
  deckCards.forEach(({ card: c, count }) => {
    const civ = CIV[c.civ] || CIV.fire;
    const safeName = esc(c.name).replace(/'/g, "\\'");
    const row = document.createElement('div');
    row.className = 'nl-row';
    row.innerHTML = `
      <div class="nl-dot" style="background:${civ.color}"></div>
      <span class="nl-name" title="${esc(c.name)}">${esc(c.name)}</span>
      <span class="nl-cnt">${count}</span>
      <button class="nl-adj" onclick="removeOne('${safeName}')">−</button>
      <button class="nl-adj" onclick="addOne('${safeName}')">＋</button>`;
    row.querySelector('.nl-name').addEventListener('click', () => showCardFromDeck(c));
    nl.appendChild(row);
  });
}

function showCardFromDeck(c) {
  if (c.id) {
    selectCard(c.id);
    return;
  }
  // No proxy id – show local card data directly
  const key = `_local_${c.name}`;
  _detailCache[key] = Object.assign({ id: key, text: '', race: '' }, c);
  document.getElementById('modal-title').textContent = c.name;
  _renderDetail(_detailCache[key]);
  openModal();
}

function renderDeck() {
  const total = deckCards.reduce((s, x) => s + x.count, 0);
  document.getElementById('tot').textContent = total;

  const rows = document.getElementById('card-rows');
  if (!deckCards.length) {
    rows.innerHTML = '<div class="zone-empty">カードがありません</div>';
    rows.style.gridTemplateColumns = `repeat(8, 80px)`;
    rows.style.minHeight = `${5 * 80 * 7/5 + 4 * 4}px`;
    document.getElementById('civ-bar').innerHTML = '';
    document.getElementById('name-list').innerHTML = '';
    return;
  }

  rows.innerHTML = '';
  // 採用枚数降順 → コスト昇順でソートして表示（deckCards本体は変更しない）
  const sorted = [...deckCards].sort((a, b) => b.count - a.count || a.card.cost - b.card.cost);
  sorted.forEach(({ card: c, count }) => {
    const civ = CIV[c.civ] || CIV.fire;
    const safeName = esc(c.name).replace(/'/g, "\\'");
    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.className = 'dk-cell';
      cell.title = `${c.name}  コスト:${c.cost}  ${civ.name}`;
      if (c.img) {
        cell.innerHTML = `<img src="${esc(c.img)}" alt="${esc(c.name)}" onerror="this.style.display='none'">`;
      } else {
        cell.innerHTML = `<div style="width:100%;height:100%;background:${civ.color};"></div>`;
      }
      cell.dataset.cardName = c.name;
      cell.innerHTML += `<button class="dk-rm" onclick="event.stopPropagation();removeOne('${safeName}')">×</button>`;
      cell.addEventListener('click', () => showCardFromDeck(c));
      rows.appendChild(cell);
    }
  });

  // Kick off background image loading for cells with no image
  _startImgLoad();

  requestAnimationFrame(fitDeckGrid);

  renderNameList();

  // Civ breakdown — horizontal bar chart
  const civC = {};
  deckCards.forEach(({ card: c, count }) => { civC[c.civ] = (civC[c.civ] || 0) + count; });
  const maxCiv = Math.max(...Object.values(civC), 1);
  const RAINBOW = 'linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#a855f7)';
  document.getElementById('civ-bar').innerHTML = `<div class="civ-chart">${
    Object.entries(civC)
      .sort((a, b) => b[1] - a[1])
      .map(([civ, n]) => {
        const ci = CIV[civ];
        const bg = civ === 'multi' ? RAINBOW : ci.color;
        const pct = Math.round((n / maxCiv) * 100);
        return `<div class="civ-row">
          <div class="civ-row-label">${ci.name}</div>
          <div class="civ-row-track"><div class="civ-row-fill" style="width:${pct}%;background:${bg};"></div></div>
          <div class="civ-row-count">${n}</div>
        </div>`;
      }).join('')
  }</div>`;

  // Cost curve
  renderCostCurve();
}

function fitDeckGrid() {
  const panel = document.querySelector('.deck-panel');
  const rows = document.getElementById('card-rows');
  if (!panel || !rows) return;
  const COLS = 8, GAP = 6;
  const total = deckCards.reduce((s, e) => s + e.count, 0);
  const rowCount = Math.max(Math.ceil(total / COLS), 5);
  const style = window.getComputedStyle(panel);
  const padV = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  let otherH = 0;
  for (const el of panel.children) {
    if (el !== rows) otherH += el.getBoundingClientRect().height;
  }
  const availH = panel.clientHeight - padV - otherH;
  const cellH = (availH - (rowCount - 1) * GAP) / rowCount;
  const cellW = Math.max(Math.floor(cellH * 5 / 7), 40);
  rows.style.gridTemplateColumns = `repeat(${COLS}, ${cellW}px)`;
}

function renderCostCurve() {
  const el = document.getElementById('cost-curve');
  if (!el) return;
  if (!deckCards.length) { el.innerHTML = ''; return; }
  const bins = {};
  deckCards.forEach(({ card: c, count }) => {
    const k = Math.min(c.cost, 10);
    bins[k] = (bins[k] || 0) + count;
  });
  const max = Math.max(...Object.values(bins), 1);
  let html = '<div class="cc-graph">';
  for (let i = 1; i <= 10; i++) {
    const n = bins[i] || 0;
    const h = Math.round((n / max) * 64);
    html += `<div class="cc-col">
      ${n ? `<div class="cc-count">${n}</div>` : ''}
      <div class="cc-bar" style="height:${h}px"></div>
      <div class="cc-label">${i === 10 ? '10+' : i}</div>
    </div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

// Sample deck
function loadSample() {
  if (deckCards.length > 0 && !confirm('現在のデッキを上書きしますか？')) return;
  deckCards = [];
  const sample = [
    { name: 'ボルメテウス・ホワイト・ドラゴン', civ: 'light', cost: 8, type: 'creature', power: 11000, img: '' },
    { name: 'ボルシャック・ドラゴン',             civ: 'fire',  cost: 6, type: 'creature', power: 6000,  img: '' },
    { name: 'バジュラ',                           civ: 'fire',  cost: 7, type: 'creature', power: 11000, img: '' },
    { name: 'クリスタル・パラディン',             civ: 'light', cost: 5, type: 'creature', power: 5500,  img: '' },
    { name: 'ロスト・ソウル',                     civ: 'dark',  cost: 7, type: 'spell',    power: 0,     img: '' },
    { name: 'ホーリー・スパーク',                 civ: 'light', cost: 3, type: 'spell',    power: 0,     img: '' },
    { name: '炎槍と水剣の裁',                     civ: 'multi', cost: 5, type: 'spell',    power: 0,     img: '' },
    { name: 'ストリーミング・チューター',         civ: 'water', cost: 3, type: 'spell',    power: 0,     img: '' },
    { name: 'アクア・ハルカス',                   civ: 'water', cost: 2, type: 'creature', power: 2000,  img: '' },
    { name: 'ブレイン・チャージャー',             civ: 'water', cost: 3, type: 'spell',    power: 0,     img: '' },
  ];
  const counts = [1, 4, 3, 3, 3, 4, 3, 4, 4, 4]; // = 33 → pad with basics
  sample.forEach((c, i) => deckCards.push({ card: c, count: counts[i] }));

  // Pad to 40 with generic blockers
  const pad = { name: 'ガルベリアス・ドラゴン', civ: 'fire', cost: 5, type: 'creature', power: 7000, img: '' };
  deckCards.push({ card: pad, count: 4 });
  const pad2 = { name: 'スパイラル・ゲート', civ: 'water', cost: 2, type: 'spell', power: 0, img: '' };
  deckCards.push({ card: pad2, count: 3 });

  document.getElementById('deck-name').value = '赤白サンプル';
  renderDeck();
  toast('サンプルデッキを読み込みました');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  GAME LOGIC                                              ║
// ╚══════════════════════════════════════════════════════════╝
function newUID() { return ++G.uid; }

function expandFrom(cardList) {
  const result = [];
  cardList.forEach(({ card: c, count }) => {
    for (let i = 0; i < count; i++) {
      result.push({ ...c, uid: newUID(), iid: `${c.name}_${newUID()}`, tapped: false });
    }
  });
  return result;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startGame() {
  const tot = deckCards.reduce((s, x) => s + x.count, 0);
  if (tot < 6) { toast('最低6枚必要です'); return; }
  const opp = { deck: [], hand: [], battleZone: [], manaZone: [], graveyard: [], shields: [] };

  // 相手デッキ初期化
  const oppName = document.getElementById('opp-deck-sel')?.value;
  if (oppName && savedDecks[oppName]) {
    opp.deck = shuffle(expandFrom(savedDecks[oppName]));
    for (let i = 0; i < 5 && opp.deck.length; i++) opp.shields.push(opp.deck.pop());
    for (let i = 0; i < 5 && opp.deck.length; i++) opp.hand.push(opp.deck.pop());
  }

  const vsMode = !!document.getElementById('vs-mode-chk')?.checked;
  const p1Name = document.getElementById('deck-name')?.value.trim() || 'プレイヤー1';
  const p2Name = oppName || 'プレイヤー2';

  G = { deck: shuffle(expandFrom(deckCards)), hand: [], battleZone: [], manaZone: [], graveyard: [], shields: [], opp, turn: 1, uid: G.uid,
        vsMode, currentPlayer: 1, p1Name, p2Name, underMode: null };
  const banner = document.getElementById('under-mode-banner'); if (banner) banner.style.display = 'none';
  G.revealedCards = []; G.revealedFrom = null; G.revealedLabel = '';
  // シールド5枚
  for (let i = 0; i < 5 && G.deck.length; i++) G.shields.push(G.deck.pop());
  // 初手5枚
  for (let i = 0; i < 5 && G.deck.length; i++) G.hand.push(G.deck.pop());
  log('ゲーム開始！シールド5枚セット・初手5枚ドロー');
  if (vsMode) log(`対戦モード: ${p1Name} vs ${p2Name}`);
  else if (oppName) log(`相手デッキ「${oppName}」でゲーム開始`);
  // 相手エリア・関連ボタンの表示切り替え
  const oppEls = ['opp-area', 'vs-divider', 'btn-opp-draw', 'btn-opp-grave', 'btn-opp-peek'];
  oppEls.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'opp-area') el.style.display = vsMode ? 'flex' : 'none';
    else el.style.display = vsMode ? 'block' : 'none';
  });

  const board = document.querySelector('.board');
  if (board) {
    board.classList.toggle('vs-board', vsMode);
    board.classList.remove('p2-view');
  }

  render();
  toast(vsMode ? `対戦モード開始！ ${p1Name} の先攻` : 'ゲーム開始！');
  // ゲーム開始時はP1側（自分エリア）にスクロール
  setTimeout(() => document.getElementById('player-area')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

function drawOne(count = 1, skipRender = false) {
  if (!G.deck.length) { toast('デッキ切れ！'); log('⚠ デッキが0枚です'); return; }
  const drawn = [];
  for (let i = 0; i < count && G.deck.length; i++) {
    const c = G.deck.pop();
    G.hand.push(c);
    drawn.push(c.name);
  }
  log('ドロー: ' + drawn.join(', '));
  if (!skipRender) render();
}

function nextTurn() {
  G.turn++;
  if (G.vsMode) {
    G.currentPlayer = G.currentPlayer === 1 ? 2 : 1;
    if (G.currentPlayer === 2) {
      G.opp.manaZone.forEach(c => c.tapped = false);
      G.opp.battleZone.forEach(c => c.tapped = false);
      drawOpp(1, true);
    } else {
      G.manaZone.forEach(c => c.tapped = false);
      G.battleZone.forEach(c => c.tapped = false);
      drawOne(1, true);
    }
    const board = document.querySelector('.board');
    if (board) board.classList.toggle('p2-view', G.currentPlayer === 2);
    const curName = G.currentPlayer === 1 ? G.p1Name : G.p2Name;
    log(`─── ターン ${G.turn}：${curName} ───`);
    // ターン切替時はターンプレイヤー側にスクロール
    const scrollId = G.currentPlayer === 2 ? 'opp-area' : 'player-area';
    setTimeout(() => document.getElementById(scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  } else {
    G.manaZone.forEach(c => c.tapped = false);
    G.battleZone.forEach(c => c.tapped = false);
    drawOne(1, true);
    log(`─── ターン ${G.turn} ───`);
  }
  render();
}

function untapAllMana() {
  G.manaZone.forEach(c => c.tapped = false);
  log('マナを全アンタップ');
  render();
}

function deckTopTo(toZone) {
  if (G.vsMode && G.currentPlayer === 2) {
    const oppMap = { manaZone: 'oppManaZone', graveyard: 'oppGraveyard', shields: 'oppShields', battleZone: 'oppBattleZone', hand: 'oppHand' };
    const oppZone = oppMap[toZone];
    if (!oppZone) return;
    if (!G.opp.deck.length) { toast('相手デッキが空です'); return; }
    const c = G.opp.deck[G.opp.deck.length - 1];
    moveOpp('oppDeck', oppZone, c.iid);
  } else {
    if (!G.deck.length) { toast('デッキが空です'); return; }
    const c = G.deck[G.deck.length - 1];
    move('deck', toZone, c.iid);
  }
}

function drawCurrent(count = 1) {
  if (G.vsMode && G.currentPlayer === 2) drawOpp(count);
  else drawOne(count);
}

function drawOpponent(count = 1) {
  if (G.vsMode && G.currentPlayer === 2) drawOne(count);
  else drawOpp(count);
}

// Move card between zones
function moveWithStack(c, fromZone, toZone, opts = {}) {
  if (c.under && c.under.length) {
    const dest = getZone(toZone);
    [...c.under].forEach(uc => { uc.tapped = false; dest.push(uc); });
    c.under = [];
  }
  move(fromZone, toZone, c.iid, opts);
}

function moveOppWithStack(c, fromZone, toZone, opts = {}) {
  if (c.under && c.under.length) {
    const dest = getOppZone(toZone);
    [...c.under].forEach(uc => { uc.tapped = false; dest.push(uc); });
    c.under = [];
  }
  moveOpp(fromZone, toZone, c.iid, opts);
}

function move(fromZone, toZone, iid, opts = {}) {
  const from = getZone(fromZone);
  const idx = from.findIndex(c => c.iid === iid);
  if (idx < 0) return;
  const [card] = from.splice(idx, 1);
  card.tapped = opts.tapped ?? false;
  const to = getZone(toZone);
  if (opts.top) to.push(card);
  else if (opts.bottom) to.unshift(card);
  else to.push(card);

  const zoneNames = { hand:'手札', battleZone:'バトルゾーン', manaZone:'マナゾーン', graveyard:'墓地', deck:'デッキ', shields:'シールド' };
  const msg = `${zoneNames[fromZone] || fromZone} → ${zoneNames[toZone] || toZone}`;
  log(`${card.name}: ${msg}`);
  toast(`「${card.name}」が\n「${zoneNames[fromZone] || fromZone}」から「${zoneNames[toZone] || toZone}」に移動しました`, card.img);
  render();
}

function getZone(name) {
  if (name === 'shields') return G.shields;
  return G[name] || [];
}

function tapToggle(zone, iid) {
  const arr = getZone(zone);
  const c = arr.find(x => x.iid === iid);
  if (!c) return;
  c.tapped = !c.tapped;
  log(`${c.tapped ? 'タップ' : 'アンタップ'}: ${c.name}`);
  render();
}

function breakShield(idx) {
  if (idx >= G.shields.length) return;
  const c = G.shields.splice(idx, 1)[0];
  G.hand.push(c);
  log(`シールドブレイク → 手札: ${c.name}`);
  render();
}

// Cast spell (from hand → briefly battleZone → graveyard)
function castSpell(iid) {
  move('hand', 'graveyard', iid);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  RENDERING                                               ║
// ╚══════════════════════════════════════════════════════════╝
function render() {
  renderShields();
  renderZone('battleZone', G.battleZone, 'battle', true);
  renderZone('manaZone', G.manaZone, 'mana');
  renderZone('handZone', G.hand, 'hand');
  setupDropZones();

  // Opponent zones
  renderOppShields();
  renderOppZone('oppBattleZone', G.opp.battleZone, 'opp-battle', true);
  renderOppZone('oppManaZone', G.opp.manaZone, 'opp-mana');
  renderOppHand();

  setTxt('cnt-shield', G.shields.length);
  setTxt('cnt-battle', G.battleZone.length);
  setTxt('cnt-mana', G.manaZone.length);
  setTxt('cnt-hand', G.hand.length);
  setTxt('cnt-deck', G.deck.length);
  setTxt('cnt-grave', G.graveyard.length);
  setTxt('cnt-grave2', G.graveyard.length);
  setTxt('hdr-grave', G.graveyard.length);
  // Graveyard pile thumbnail: show top card image
  const graveThumb = document.getElementById('grave-thumb');
  const graveEmpty = document.getElementById('grave-pile-empty');
  if (graveThumb && graveEmpty) {
    const topCard = G.graveyard.length ? G.graveyard[G.graveyard.length - 1] : null;
    if (topCard && topCard.img) {
      graveThumb.src = topCard.img;
      graveThumb.style.display = '';
      graveEmpty.style.display = 'none';
    } else {
      graveThumb.style.display = 'none';
      graveEmpty.style.display = '';
    }
  }
  setTxt('turn-n', G.turn);
  const lbl = document.getElementById('turn-player-label');
  if (lbl) {
    if (G.vsMode) {
      const curName = G.currentPlayer === 1 ? G.p1Name : G.p2Name;
      lbl.textContent = `${curName} | `;
      lbl.style.color = G.currentPlayer === 1 ? 'var(--accent)' : 'var(--accent2)';
    } else {
      lbl.textContent = '';
    }
  }
  setTxt('hand-n', G.hand.length);
  setTxt('mana-n', G.manaZone.length);
  setTxt('cnt-opp-shield', G.opp.shields.length);
  setTxt('cnt-opp-battle', G.opp.battleZone.length);
  setTxt('cnt-opp-mana', G.opp.manaZone.length);
  setTxt('cnt-opp-hand', G.opp.hand.length);
  setTxt('cnt-opp-deck', G.opp.deck.length);
  setTxt('cnt-opp-grave', G.opp.graveyard.length);
  setTxt('hdr-opp-grave', G.opp.graveyard.length);
  renderRevealedZone();
  // 相手墓地サムネ
  const oppGraveThumb = document.getElementById('opp-grave-thumb');
  const oppGraveEmpty = document.getElementById('opp-grave-pile-empty');
  if (oppGraveThumb && oppGraveEmpty) {
    const topCard = G.opp.graveyard.length ? G.opp.graveyard[G.opp.graveyard.length - 1] : null;
    if (topCard && topCard.img) {
      oppGraveThumb.src = topCard.img;
      oppGraveThumb.style.display = '';
      oppGraveEmpty.style.display = 'none';
    } else {
      oppGraveThumb.style.display = 'none';
      oppGraveEmpty.style.display = '';
    }
  }
}

const _OPP_ZONE_MAP = { 'opp-battle':'oppBattleZone', 'opp-mana':'oppManaZone', 'opp-hand':'oppHand' };
const _PLR_ZONE_MAP = { battle:'battleZone', mana:'manaZone', hand:'hand', shields:'shields', graveyard:'graveyard', deck:'deck' };

function setupDropZones() {
  const targets = [
    { id: 'battleZone',    zone: 'battleZone' },
    { id: 'manaZone',      zone: 'manaZone'   },
    { id: 'handZone',      zone: 'hand'        },
    { id: 'oppBattleZone', zone: 'opp-battle'  },
    { id: 'oppManaZone',   zone: 'opp-mana'    },
    { id: 'oppHandZone',   zone: 'opp-hand'    },
  ];
  targets.forEach(({ id, zone }) => {
    const el = document.getElementById(id);
    if (!el || el._dropBound) return;
    el._dropBound = true;
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over'); });
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (!_drag.iid || _drag.zone === zone) { _drag = {iid:null,zone:null}; return; }
      const fromIsOpp = _drag.zone in _OPP_ZONE_MAP;
      const toIsOpp   = zone in _OPP_ZONE_MAP;
      if (fromIsOpp && toIsOpp) {
        moveOpp(_OPP_ZONE_MAP[_drag.zone], _OPP_ZONE_MAP[zone], _drag.iid);
      } else if (!fromIsOpp && !toIsOpp) {
        move(_drag.zone, zone, _drag.iid);
      }
      _drag = { iid: null, zone: null };
    });
  });
}

function setTxt(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }

function renderShields() {
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
}

function renderZone(elId, cards, zone, useStack = false) {
  const el = document.getElementById(elId);
  if (!cards.length) { el.innerHTML = '<div class="zone-empty">空</div>'; return; }
  el.innerHTML = '';
  cards.forEach(c => el.appendChild(useStack ? makeCardStack(c, zone) : makeCard(c, zone)));
}

function makeCard(c, zone) {
  const d = document.createElement('div');
  d.className = 'gc' + (c.tapped ? ' tapped' : '');
  d.dataset.iid = c.iid;
  d.title = c.name;

  const civData = CIV[c.civ] || CIV.fire;
  const face = document.createElement('div');
  face.className = 'gc-face';
  face.style.borderColor = civData.color;

  if (c.img) {
    const img = document.createElement('img');
    img.className = 'gc-art';
    img.src = c.img;
    img.alt = c.name;
    img.onerror = () => {
      img.replaceWith(makePh(c));
    };
    face.appendChild(img);
  } else {
    face.appendChild(makePh(c));
  }

  d.appendChild(face);

  d.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (zone.startsWith('opp-')) showCtxOppCard(e, c, zone);
    else showCtxCard(e, c, zone);
  });
  d.addEventListener('click', e => {
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
  if (G.underMode && (zone === 'battle' || zone === 'opp-battle')) d.classList.add('under-target');

  // Drag & drop
  d.draggable = true;
  d.addEventListener('dragstart', e => {
    _drag = { iid: c.iid, zone };
    d.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  d.addEventListener('dragend', () => d.classList.remove('dragging'));

  // Hover preview
  d.addEventListener('mouseenter', e => showPreview(e, c));
  d.addEventListener('mousemove',  _posPreview);
  d.addEventListener('mouseleave', hidePreview);

  return d;
}


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

const _STACK_ZONES_PLR = [
  { val: 'hand',         label: '手札' },
  { val: 'battleZone',   label: 'バトルゾーン' },
  { val: 'manaZone',     label: 'マナゾーン' },
  { val: 'shields',      label: 'シールド' },
  { val: 'deck_top',     label: 'デッキトップ' },
  { val: 'deck_bottom',  label: 'デッキボトム' },
  { val: 'graveyard',    label: '墓地' },
];
const _STACK_ZONES_OPP = [
  { val: 'oppHand',        label: '相手手札' },
  { val: 'oppBattleZone',  label: '相手BZ' },
  { val: 'oppManaZone',    label: '相手マナ' },
  { val: 'oppShields',     label: '相手シールド' },
  { val: 'oppDeck_top',    label: '相手デッキトップ' },
  { val: 'oppDeck_bottom', label: '相手デッキボトム' },
  { val: 'oppGraveyard',   label: '相手墓地' },
];

function showStackModal(topCard, zone) {
  const isOpp = zone === 'oppBattleZone';
  const underCards = topCard.under || [];
  const zoneOpts = (isOpp ? _STACK_ZONES_OPP : _STACK_ZONES_PLR)
    .map(z => `<option value="${z.val}">${z.label}</option>`).join('');
  const piid = esc(topCard.iid);

  document.getElementById('modal-title').textContent = topCard.name + ' (スタック)';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
      ${[topCard, ...underCards].map((c, i) => {
        const civ = CIV[c.civ] || CIV.fire;
        const isTop = i === 0;
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px;background:var(--surface2);border-radius:6px;">'
          + '<div style="width:24px;display:flex;align-items:center;justify-content:center;">'
          + (!isTop ? '<input type="checkbox" class="stack-cb" data-iid="' + esc(c.iid) + '" style="width:16px;height:16px;cursor:pointer;">' : '<span style="color:var(--text-dim);font-size:0.7rem;">本体</span>')
          + '</div>'
          + '<div style="width:44px;height:62px;border-radius:5px;overflow:hidden;flex-shrink:0;background:' + civ.color + ';">'
          + (c.img ? '<img src="' + esc(c.img) + '" style="width:100%;height:100%;object-fit:cover;">' : '')
          + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="font-size:0.82rem;font-weight:600;">' + esc(c.name) + '</div>'
          + '<div style="font-size:0.72rem;color:var(--text-dim);">' + (isTop ? '本体（一番上）' : i + '枚下') + '</div>'
          + '</div></div>';
      }).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--border);">
      <label style="display:flex;align-items:center;gap:5px;font-size:0.82rem;cursor:pointer;white-space:nowrap;">
        <input type="checkbox" id="stack-all-cb" style="width:15px;height:15px;" onchange="document.querySelectorAll('.stack-cb').forEach(cb=>cb.checked=this.checked)">
        全選択
      </label>
      <select id="stack-dest" style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:6px;font-size:0.85rem;">${zoneOpts}</select>
      <button class="btn btn-orange btn-sm" onclick="moveSelectedUnder('${piid}','${zone}')">移動</button>
    </div>`;
  openModal();
}

function moveSelectedUnder(parentIid, zone) {
  const arr = zone === 'oppBattleZone' ? G.opp.battleZone : G.battleZone;
  const parent = arr.find(c => c.iid === parentIid);
  if (!parent || !parent.under) return;
  const dest = document.getElementById('stack-dest')?.value;
  const checked = [...document.querySelectorAll('.stack-cb:checked')].map(cb => cb.dataset.iid);
  if (!checked.length) { toast('カードを選択してください'); return; }

  const allZones = [..._STACK_ZONES_PLR, ..._STACK_ZONES_OPP];
  const destLabel = allZones.find(z => z.val === dest)?.label || dest;

  checked.forEach(iid => {
    const idx = parent.under.findIndex(c => c.iid === iid);
    if (idx < 0) return;
    const [child] = parent.under.splice(idx, 1);
    child.tapped = false;
    if      (dest === 'hand')           G.hand.push(child);
    else if (dest === 'battleZone')     G.battleZone.push(child);
    else if (dest === 'manaZone')       G.manaZone.push(child);
    else if (dest === 'shields')        G.shields.push(child);
    else if (dest === 'deck_top')       G.deck.push(child);
    else if (dest === 'deck_bottom')    G.deck.unshift(child);
    else if (dest === 'graveyard')      G.graveyard.push(child);
    else if (dest === 'oppHand')        G.opp.hand.push(child);
    else if (dest === 'oppBattleZone')  G.opp.battleZone.push(child);
    else if (dest === 'oppManaZone')    G.opp.manaZone.push(child);
    else if (dest === 'oppShields')     G.opp.shields.push(child);
    else if (dest === 'oppDeck_top')    G.opp.deck.push(child);
    else if (dest === 'oppDeck_bottom') G.opp.deck.unshift(child);
    else if (dest === 'oppGraveyard')   G.opp.graveyard.push(child);
    log('「' + child.name + '」をスタックから' + destLabel + 'へ');
  });
  closeModal();
  render();
}

// ─── Opponent rendering ──────────────────────────────────────────────────────

function renderOppShields() {
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
}

function renderOppHand() {
  const el = document.getElementById('oppHandZone');
  if (!G.opp.hand.length) { el.innerHTML = '<div class="zone-empty">空</div>'; return; }
  el.innerHTML = '';
  G.opp.hand.forEach((c, i) => {
    const d = makeCard(c, 'opp-hand');
    el.appendChild(d);
  });
}

function renderOppZone(elId, cards, zone, useStack = false) {
  const el = document.getElementById(elId);
  if (!cards.length) { el.innerHTML = '<div class="zone-empty">空</div>'; return; }
  el.innerHTML = '';
  cards.forEach(c => {
    const d = useStack ? makeCardStack(c, zone) : makeCard(c, zone);
    el.appendChild(d);
  });
}

// ─── Opponent game logic ─────────────────────────────────────────────────────

function getOppZone(name) {
  const map = {
    oppHand: G.opp.hand,
    oppBattleZone: G.opp.battleZone,
    oppManaZone: G.opp.manaZone,
    oppGraveyard: G.opp.graveyard,
    oppDeck: G.opp.deck,
    oppShields: G.opp.shields,
  };
  return map[name] || [];
}

const OPP_ZONE_NAMES = { oppHand:'相手手札', oppBattleZone:'相手BZ', oppManaZone:'相手マナ', oppGraveyard:'相手墓地', oppDeck:'相手デッキ', oppShields:'相手シールド' };

function moveOpp(fromZone, toZone, iid, opts = {}) {
  const from = getOppZone(fromZone);
  const idx = from.findIndex(c => c.iid === iid);
  if (idx < 0) return;
  const [card] = from.splice(idx, 1);
  card.tapped = opts.tapped ?? false;
  const to = getOppZone(toZone);
  if (opts.top) to.push(card);
  else if (opts.bottom) to.unshift(card);
  else to.push(card);
  log(`相手 ${card.name}: ${OPP_ZONE_NAMES[fromZone] || fromZone} → ${OPP_ZONE_NAMES[toZone] || toZone}`);
  toast(`「${card.name}」が\n「${OPP_ZONE_NAMES[fromZone] || fromZone}」から「${OPP_ZONE_NAMES[toZone] || toZone}」に移動しました`, card.img);
  render();
}

function tapToggleOpp(zone, iid) {
  const arr = getOppZone(zone);
  const c = arr.find(x => x.iid === iid);
  if (!c) return;
  c.tapped = !c.tapped;
  log(`相手 ${c.tapped ? 'タップ' : 'アンタップ'}: ${c.name}`);
  render();
}

function untapAllOppMana() {
  G.opp.manaZone.forEach(c => c.tapped = false);
  G.opp.battleZone.forEach(c => c.tapped = false);
  log('相手マナ・BZを全アンタップ');
  render();
}

function breakOppShield(idx) {
  if (idx >= G.opp.shields.length) return;
  const c = G.opp.shields.splice(idx, 1)[0];
  G.opp.hand.push(c);
  log(`相手シールドブレイク → 相手手札: ${c.name}`);
  toast(`「${c.name}」が\n「相手シールド」から「相手手札」に移動しました`, c.img);
  render();
}

function drawOpp(count = 1, skipRender = false) {
  if (!G.opp.deck.length) { toast('相手デッキ切れ！'); log('⚠ 相手デッキが0枚です'); return; }
  const drawn = [];
  for (let i = 0; i < count && G.opp.deck.length; i++) {
    const c = G.opp.deck.pop();
    G.opp.hand.push(c);
    drawn.push(c.name);
    toast(`「${c.name}」が\n「相手デッキ」から「相手手札」に移動しました`, c.img);
  }
  log('相手ドロー: ' + drawn.join(', '));
  if (!skipRender) render();
}

function showCtxOppShield(e, idx) {
  if (idx >= G.opp.shields.length) return;
  const c = G.opp.shields[idx];
  const iid = c.iid;
  openCtx(e, [
    { label: '相手手札へ（シールドブレイク）', fn: () => moveOpp('oppShields', 'oppHand', iid) },
    { label: '相手マナゾーンへ',               fn: () => moveOpp('oppShields', 'oppManaZone', iid) },
    { label: '相手バトルゾーンへ',             fn: () => moveOpp('oppShields', 'oppBattleZone', iid) },
    { label: '相手デッキトップへ',             fn: () => moveOpp('oppShields', 'oppDeck', iid, { top: true }) },
    { label: '相手デッキボトムへ',             fn: () => moveOpp('oppShields', 'oppDeck', iid, { bottom: true }) },
    { sep: true },
    { label: '相手墓地へ', fn: () => moveOpp('oppShields', 'oppGraveyard', iid), red: true },
    { sep: true },
    { label: c.faceUp ? '裏向きにする' : '表向きにする', fn: () => { G.opp.shields[idx].faceUp = !G.opp.shields[idx].faceUp; render(); } },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'oppShields', true) },
  ]);
}

function showCtxOppCard(e, c, zone) {
  const items = [];
  if (zone === 'opp-hand') {
    items.push({ label: '相手マナゾーンへ',               fn: () => moveOpp('oppHand', 'oppManaZone', c.iid) });
    items.push({ label: '相手バトルゾーンへ',             fn: () => moveOpp('oppHand', 'oppBattleZone', c.iid) });
    items.push({ label: '相手シールドへ',                 fn: () => moveOpp('oppHand', 'oppShields', c.iid) });
    items.push({ label: '相手デッキトップへ',             fn: () => moveOpp('oppHand', 'oppDeck', c.iid, { top: true }) });
    items.push({ label: '相手デッキボトムへ',             fn: () => moveOpp('oppHand', 'oppDeck', c.iid, { bottom: true }) });
    items.push({ sep: true });
    items.push({ label: '捨てる（相手墓地へ）',           fn: () => moveOpp('oppHand', 'oppGraveyard', c.iid), red: true });
    items.push({ sep: true });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'oppHand', true) });
  } else if (zone === 'opp-battle') {
    const hs = !!(c.under && c.under.length);
    const s = hs ? '（本体のみ）' : '';
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（攻撃）', fn: () => tapToggleOpp('oppBattleZone', c.iid) });
    if (hs) items.push({ label: 'スタックを確認', fn: () => showStackModal(c, 'oppBattleZone') });
    items.push({ label: '相手手札に戻す' + s,   fn: () => moveOpp('oppBattleZone', 'oppHand', c.iid) });
    if (hs) items.push({ label: 'スタックごと相手手札へ',       fn: () => moveOppWithStack(c, 'oppBattleZone', 'oppHand') });
    items.push({ label: '相手マナゾーンへ' + s, fn: () => moveOpp('oppBattleZone', 'oppManaZone', c.iid) });
    if (hs) items.push({ label: 'スタックごと相手マナへ',       fn: () => moveOppWithStack(c, 'oppBattleZone', 'oppManaZone') });
    items.push({ label: '相手シールドへ' + s,   fn: () => moveOpp('oppBattleZone', 'oppShields', c.iid) });
    if (hs) items.push({ label: 'スタックごと相手シールドへ',   fn: () => moveOppWithStack(c, 'oppBattleZone', 'oppShields') });
    items.push({ label: '相手デッキトップへ' + s, fn: () => moveOpp('oppBattleZone', 'oppDeck', c.iid, { top: true }) });
    if (hs) items.push({ label: 'スタックごと相手デッキトップへ', fn: () => moveOppWithStack(c, 'oppBattleZone', 'oppDeck', { top: true }) });
    items.push({ label: '相手デッキボトムへ' + s, fn: () => moveOpp('oppBattleZone', 'oppDeck', c.iid, { bottom: true }) });
    if (hs) items.push({ label: 'スタックごと相手デッキボトムへ', fn: () => moveOppWithStack(c, 'oppBattleZone', 'oppDeck', { bottom: true }) });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'oppBattleZone', true) });
    items.push({ sep: true });
    items.push({ label: '破壊（相手墓地へ）' + s, fn: () => moveOpp('oppBattleZone', 'oppGraveyard', c.iid), red: true });
    if (hs) items.push({ label: 'スタックごと相手墓地へ', fn: () => moveOppWithStack(c, 'oppBattleZone', 'oppGraveyard'), red: true });
  } else if (zone === 'opp-mana') {
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（マナ使用）', fn: () => tapToggleOpp('oppManaZone', c.iid) });
    items.push({ label: '相手手札に戻す',                 fn: () => moveOpp('oppManaZone', 'oppHand', c.iid) });
    items.push({ label: '相手バトルゾーンへ',             fn: () => moveOpp('oppManaZone', 'oppBattleZone', c.iid) });
    items.push({ label: '相手シールドへ',                 fn: () => moveOpp('oppManaZone', 'oppShields', c.iid) });
    items.push({ label: '相手デッキトップへ',             fn: () => moveOpp('oppManaZone', 'oppDeck', c.iid, { top: true }) });
    items.push({ label: '相手デッキボトムへ',             fn: () => moveOpp('oppManaZone', 'oppDeck', c.iid, { bottom: true }) });
    items.push({ sep: true });
    items.push({ label: '相手墓地へ',                     fn: () => moveOpp('oppManaZone', 'oppGraveyard', c.iid), red: true });
  }
  if (items.length) items.push({ sep: true });
  items.push({ label: 'カード詳細', fn: () => showCardDetail(c) });
  openCtx(e, items);
}

function makePh(c) {
  const div = document.createElement('div');
  div.className = 'gc-art-ph';
  div.style.background = CIV[c.civ]?.color || '#888';
  div.textContent = CIV[c.civ]?.emoji || '?';
  return div;
}

function fmtPow(p) { return p >= 1000 ? (p / 1000).toFixed(p % 1000 === 0 ? 0 : 1) + 'k' : p; }

// ─── Card hover preview ──────────────────────────────────────────────────────
const _cpEl   = document.getElementById('card-preview');
const _cpImg  = document.getElementById('cp-img');
const _cpName = document.getElementById('cp-name');
const _cpSub  = document.getElementById('cp-sub');

function showPreview(e, c) {
  const civ = CIV[c.civ] || CIV.fire;
  if (c.img) {
    _cpImg.src = c.img;
    _cpImg.style.display = 'block';
  } else {
    _cpImg.style.display = 'none';
  }
  _cpName.textContent = c.name;
  _cpSub.textContent = [
    `${civ.name}`,
    `コスト ${c.cost}`,
    c.power ? fmtPow(c.power) : '',
  ].filter(Boolean).join('  ');
  _cpEl.style.display = 'block';
  _posPreview(e);
}

function _posPreview(e) {
  const w = 200, pad = 16;
  let x = e.clientX + pad;
  let y = e.clientY - 80;
  if (x + w > window.innerWidth - 4) x = e.clientX - w - pad;
  y = Math.max(4, Math.min(y, window.innerHeight - 280));
  _cpEl.style.left = x + 'px';
  _cpEl.style.top  = y + 'px';
}

function hidePreview() { _cpEl.style.display = 'none'; }

// ╔══════════════════════════════════════════════════════════╗
// ║  CONTEXT MENUS                                           ║
// ╚══════════════════════════════════════════════════════════╝
function showCtxShield(e, idx) {
  const c = G.shields[idx];
  if (!c) return;
  const iid = c.iid;
  openCtx(e, [
    { label: '手札へ（シールドブレイク）', fn: () => move('shields', 'hand', iid) },
    { label: 'マナゾーンへ',               fn: () => move('shields', 'manaZone', iid) },
    { label: 'バトルゾーンへ',             fn: () => move('shields', 'battleZone', iid) },
    { label: 'デッキトップへ',             fn: () => move('shields', 'deck', iid, { top: true }) },
    { label: 'デッキボトムへ',             fn: () => move('shields', 'deck', iid, { bottom: true }) },
    { sep: true },
    { label: '墓地へ', fn: () => move('shields', 'graveyard', iid), red: true },
    { sep: true },
    { label: c.faceUp ? '裏向きにする' : '表向きにする', fn: () => { G.shields[idx].faceUp = !G.shields[idx].faceUp; render(); } },
    { label: '下に入れる...', fn: () => enterUnderMode(c, 'shields', false) },
  ]);
}

function showCtxCard(e, c, zone) {
  const items = [];
  if (zone === 'hand') {
    items.push({ label: 'マナゾーンへ',               fn: () => move('hand', 'manaZone', c.iid) });
    items.push({ label: 'バトルゾーンへ',             fn: () => move('hand', 'battleZone', c.iid) });
    items.push({ label: 'シールドへ（表向き追加）',   fn: () => move('hand', 'shields', c.iid) });
    items.push({ label: 'デッキトップへ',             fn: () => move('hand', 'deck', c.iid, { top: true }) });
    items.push({ label: 'デッキボトムへ',             fn: () => move('hand', 'deck', c.iid, { bottom: true }) });
    items.push({ sep: true });
    items.push({ label: '捨てる（墓地へ）', fn: () => move('hand', 'graveyard', c.iid), red: true });
    items.push({ sep: true });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'hand', false) });
  } else if (zone === 'battle') {
    const hs = !!(c.under && c.under.length);
    const s = hs ? '（本体のみ）' : '';
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（攻撃）', fn: () => tapToggle('battleZone', c.iid) });
    if (hs) items.push({ label: 'スタックを確認', fn: () => showStackModal(c, 'battleZone') });
    items.push({ label: '手札に戻す' + s,   fn: () => move('battleZone', 'hand', c.iid) });
    if (hs) items.push({ label: 'スタックごと手札へ',       fn: () => moveWithStack(c, 'battleZone', 'hand') });
    items.push({ label: 'マナゾーンへ' + s, fn: () => move('battleZone', 'manaZone', c.iid) });
    if (hs) items.push({ label: 'スタックごとマナへ',       fn: () => moveWithStack(c, 'battleZone', 'manaZone') });
    items.push({ label: 'シールドへ' + s,   fn: () => move('battleZone', 'shields', c.iid) });
    if (hs) items.push({ label: 'スタックごとシールドへ',   fn: () => moveWithStack(c, 'battleZone', 'shields') });
    items.push({ label: 'デッキトップへ' + s, fn: () => move('battleZone', 'deck', c.iid, { top: true }) });
    if (hs) items.push({ label: 'スタックごとデッキトップへ', fn: () => moveWithStack(c, 'battleZone', 'deck', { top: true }) });
    items.push({ label: 'デッキボトムへ' + s, fn: () => move('battleZone', 'deck', c.iid, { bottom: true }) });
    if (hs) items.push({ label: 'スタックごとデッキボトムへ', fn: () => moveWithStack(c, 'battleZone', 'deck', { bottom: true }) });
    items.push({ label: '下に入れる...', fn: () => enterUnderMode(c, 'battleZone', false) });
    items.push({ sep: true });
    items.push({ label: '破壊（墓地へ）' + s, fn: () => move('battleZone', 'graveyard', c.iid), red: true });
    if (hs) items.push({ label: 'スタックごと墓地へ', fn: () => moveWithStack(c, 'battleZone', 'graveyard'), red: true });
  } else if (zone === 'mana') {
    items.push({ label: c.tapped ? 'アンタップ' : 'タップ（マナ使用）', fn: () => tapToggle('manaZone', c.iid) });
    items.push({ label: '手札に戻す',                 fn: () => move('manaZone', 'hand', c.iid) });
    items.push({ label: 'バトルゾーンへ',             fn: () => move('manaZone', 'battleZone', c.iid) });
    items.push({ label: 'シールドへ',                 fn: () => move('manaZone', 'shields', c.iid) });
    items.push({ label: 'デッキトップへ',             fn: () => move('manaZone', 'deck', c.iid, { top: true }) });
    items.push({ label: 'デッキボトムへ',             fn: () => move('manaZone', 'deck', c.iid, { bottom: true }) });
    items.push({ sep: true });
    items.push({ label: '墓地へ', fn: () => move('manaZone', 'graveyard', c.iid), red: true });
  }
  items.push({ sep: true });
  items.push({ label: 'カード詳細', fn: () => showCardDetail(c) });
  openCtx(e, items);
}

function openCtx(e, items) {
  closeCtx();
  const m = document.getElementById('ctx');
  m._items = items;
  m.innerHTML = items.map((it, i) => {
    if (it.sep) return '<div class="ctx-sep"></div>';
    return `<div class="ctx-item${it.red ? ' red' : ''}" onclick="runCtx(${i})">${it.label}</div>`;
  }).join('');

  const x = Math.min(e.clientX, window.innerWidth - 190);
  const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 20);
  m.style.cssText = `display:block;left:${x}px;top:${y}px;`;
  setTimeout(() => document.addEventListener('click', closeCtx, { once: true }), 10);
}

function runCtx(i) {
  const m = document.getElementById('ctx');
  const item = m._items?.[i];
  if (item?.fn) item.fn();
  closeCtx();
}

function closeCtx() { document.getElementById('ctx').style.display = 'none'; }

// ╔══════════════════════════════════════════════════════════╗
// ║  MODALS                                                  ║
// ╚══════════════════════════════════════════════════════════╝
function showCardDetail(c) {
  const civ = CIV[c.civ] || CIV.fire;
  document.getElementById('modal-title').textContent = c.name;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">
      <div style="flex-shrink:0;width:120px;height:168px;border-radius:8px;overflow:hidden;background:${civ.color};display:flex;align-items:center;justify-content:center;">
        ${c.img ? `<img src="${esc(c.img)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : ''}
      </div>
      <table style="font-size:0.88rem;border-collapse:collapse;flex:1;min-width:160px;">
        <tr><td style="color:var(--text-dim);padding:4px 10px 4px 0;">文明</td>
            <td><span style="background:${civ.color};color:${civ.fg};padding:2px 10px;border-radius:12px;font-weight:700;">${civ.name}</span></td></tr>
        <tr><td style="color:var(--text-dim);padding:4px 10px 4px 0;">コスト</td><td>${c.cost}</td></tr>
        <tr><td style="color:var(--text-dim);padding:4px 10px 4px 0;">種類</td>
            <td>${c.type === 'creature' ? 'クリーチャー' : c.type === 'spell' ? '呪文' : '進化クリーチャー'}</td></tr>
        ${c.power ? `<tr><td style="color:var(--text-dim);padding:4px 10px 4px 0;">パワー</td><td>${c.power.toLocaleString()}</td></tr>` : ''}
      </table>
    </div>
    ${c.text ? `<div class="card-text">${esc(c.text)}</div>` : ''}`;
  openModal();
}

function showGraveModal() {
  document.getElementById('modal-title').textContent = `墓地 (${G.graveyard.length}枚)`;
  if (!G.graveyard.length) {
    document.getElementById('modal-body').innerHTML = '<div class="zone-empty" style="padding:30px 0;">墓地は空です</div>';
  } else {
    document.getElementById('modal-body').innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${G.graveyard.map(c => {
          const civ = CIV[c.civ] || CIV.fire;
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;" onclick="graveAct('${esc(c.iid).replace(/'/g,"\\'")}')">
            <div style="width:76px;height:108px;border-radius:7px;overflow:hidden;background:${civ.color};display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.15);">
              ${c.img ? `<img src="${esc(c.img)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : `<span style="font-size:2.2rem;">${civ.emoji}</span>`}
            </div>
            <div style="font-size:0.65rem;text-align:center;max-width:76px;word-break:break-all;color:var(--text-dim);">${esc(c.name)}</div>
          </div>`;
        }).join('')}
      </div>`;
  }
  openModal();
}

function _actCardImg(c) {
  const civ = CIV[c.civ] || CIV.fire;
  return `<div style="flex-shrink:0;width:120px;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.4);">
    ${c.img
      ? `<img src="${esc(c.img)}" style="width:120px;height:168px;object-fit:cover;display:block;" onerror="this.style.opacity='.3'">`
      : `<div style="width:120px;height:168px;background:${civ.color};display:flex;align-items:center;justify-content:center;font-size:3rem;">${civ.emoji}</div>`}
  </div>`;
}

function graveAct(iid) {
  const c = G.graveyard.find(x => x.iid === iid);
  if (!c) return;
  document.getElementById('modal-title').textContent = c.name;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;margin-top:4px;">
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
        <button class="btn btn-gray btn-sm" onclick="showGraveModal()" style="align-self:flex-start;">← 戻る</button>
        <button class="btn btn-gray" onclick="move('graveyard','hand','${esc(iid)}');showGraveModal()">手札に加える</button>
        <button class="btn btn-gray" onclick="move('graveyard','battleZone','${esc(iid)}');showGraveModal()">バトルゾーンへ（リアニメート）</button>
        <button class="btn btn-gray" onclick="move('graveyard','manaZone','${esc(iid)}');showGraveModal()">マナゾーンへ</button>
        <button class="btn btn-gray" onclick="move('graveyard','shields','${esc(iid)}');showGraveModal()">シールドへ</button>
        <button class="btn btn-gray" onclick="move('graveyard','deck','${esc(iid)}',{top:true});showGraveModal()">デッキトップへ戻す</button>
        <button class="btn btn-gray" onclick="move('graveyard','deck','${esc(iid)}',{bottom:true});showGraveModal()">デッキボトムへ戻す</button>
        <button class="btn btn-gray" onclick="showCardDetail(G.graveyard.find(x=>x.iid==='${esc(iid)}') || G.hand[0])">カード詳細</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.graveyard.find(x=>x.iid==='${esc(iid)}'),'graveyard',false)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function getDeckN() {
  return Math.max(1, Math.min(40, parseInt(document.getElementById('deck-n')?.value) || 3));
}

function startReveal(n, isOpp, isReveal) {
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
      return '<div class="rz-card" onclick="revealedCardClick(event,&#39;' + esc(c.iid) + '&#39;)" oncontextmenu="revealedCardCtx(event,&#39;' + esc(c.iid) + '&#39;);event.preventDefault()">'
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
    + '<input type="checkbox" id="rev-all-cb" style="width:14px;height:14px;" onchange="document.querySelectorAll(&#39;.rev-cb&#39;).forEach(cb=>cb.checked=this.checked)">全選択</label>'
    + '<select id="rev-dest" style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:6px;font-size:0.82rem;">' + zoneOpts + '</select>'
    + '<button class="btn btn-orange btn-sm" onclick="moveSelectedRevealed()">移動</button>'
    + '<button class="btn btn-gray btn-sm" onclick="returnAllRevealed(&#39;' + backZone + '&#39;)">全部デッキに戻す</button>'
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
}

function shuffleDeck() {
  shuffle(G.deck);
  log('デッキをシャッフルしました');
  closeModal();
}

function shuffleOppDeck() {
  shuffle(G.opp.deck);
  log('相手デッキをシャッフルしました');
  closeModal();
}

function showOppDeckModal() {
  document.getElementById('modal-title').textContent = `相手デッキ残り (${G.opp.deck.length}枚) — 上から順`;
  if (!G.opp.deck.length) {
    document.getElementById('modal-body').innerHTML = '<div class="zone-empty" style="padding:30px 0;">相手デッキが空です</div>';
  } else {
    const fromTop = [...G.opp.deck].reverse();
    document.getElementById('modal-body').innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <button class="btn btn-gray btn-sm" onclick="shuffleOppDeck()">シャッフル</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,70px);gap:5px;padding:4px 0;">
        ${fromTop.map((c, i) => {
          const civ = CIV[c.civ] || CIV.fire;
          const pos = i === 0 ? 'トップ' : i === fromTop.length - 1 ? 'ボトム' : `${i + 1}枚目`;
          return `<div style="cursor:pointer;border-radius:5px;overflow:hidden;width:70px;position:relative;" onclick="oppDeckAct('${esc(c.iid).replace(/'/g,"\\'")}','${esc(pos)}')" title="${esc(c.name)}（${pos}）">
            ${c.img
              ? `<img src="${esc(c.img)}" style="width:70px;height:98px;object-fit:cover;display:block;" onerror="this.style.opacity='.25'">`
              : `<div style="width:70px;height:98px;background:${civ.color};display:flex;align-items:center;justify-content:center;font-size:1.6rem;">${civ.emoji}</div>`}
            <div style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,.7);color:#fff;font-size:0.55rem;padding:1px 4px;border-radius:2px;">${i + 1}</div>
          </div>`;
        }).join('')}
      </div>`;
  }
  openModal();
}

function oppDeckAct(iid, posLabel) {
  const c = G.opp.deck.find(x => x.iid === iid);
  if (!c) return;
  document.getElementById('modal-title').textContent = `相手: ${c.name}（${posLabel}）`;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;margin-top:4px;">
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
        <button class="btn btn-gray btn-sm" onclick="showOppDeckModal()" style="align-self:flex-start;">← 戻る</button>
        <button class="btn btn-gray" onclick="moveOpp('oppDeck','oppHand','${esc(iid)}');showOppDeckModal()">手札へ</button>
        <button class="btn btn-gray" onclick="moveOpp('oppDeck','oppBattleZone','${esc(iid)}');showOppDeckModal()">バトルゾーンへ</button>
        <button class="btn btn-gray" onclick="moveOpp('oppDeck','oppManaZone','${esc(iid)}');showOppDeckModal()">マナゾーンへ</button>
        <button class="btn btn-gray" onclick="moveOpp('oppDeck','oppShields','${esc(iid)}');showOppDeckModal()">シールドへ</button>
        <button class="btn btn-gray" onclick="moveOpp('oppDeck','oppGraveyard','${esc(iid)}');showOppDeckModal()">墓地へ</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.opp.deck.find(x=>x.iid==='${esc(iid)}'),'oppDeck',true)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function showOppGraveModal() {
  document.getElementById('modal-title').textContent = `相手墓地 (${G.opp.graveyard.length}枚)`;
  if (!G.opp.graveyard.length) {
    document.getElementById('modal-body').innerHTML = '<div class="zone-empty" style="padding:30px 0;">相手墓地は空です</div>';
  } else {
    document.getElementById('modal-body').innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${G.opp.graveyard.map(c => {
          const civ = CIV[c.civ] || CIV.fire;
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;" onclick="oppGraveAct('${esc(c.iid).replace(/'/g,"\\'")}')">
            <div style="width:76px;height:108px;border-radius:7px;overflow:hidden;background:${civ.color};display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.15);">
              ${c.img ? `<img src="${esc(c.img)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : `<span style="font-size:2.2rem;">${civ.emoji}</span>`}
            </div>
            <div style="font-size:0.65rem;text-align:center;max-width:76px;word-break:break-all;color:var(--text-dim);">${esc(c.name)}</div>
          </div>`;
        }).join('')}
      </div>`;
  }
  openModal();
}

function oppGraveAct(iid) {
  const c = G.opp.graveyard.find(x => x.iid === iid);
  if (!c) return;
  document.getElementById('modal-title').textContent = `相手: ${c.name}`;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;margin-top:4px;">
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
        <button class="btn btn-gray btn-sm" onclick="showOppGraveModal()" style="align-self:flex-start;">← 戻る</button>
        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppHand','${esc(iid)}');showOppGraveModal()">手札に加える</button>
        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppBattleZone','${esc(iid)}');showOppGraveModal()">バトルゾーンへ</button>
        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppManaZone','${esc(iid)}');showOppGraveModal()">マナゾーンへ</button>
        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppShields','${esc(iid)}');showOppGraveModal()">シールドへ</button>
        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppDeck','${esc(iid)}',{top:true});showOppGraveModal()">デッキトップへ戻す</button>
        <button class="btn btn-gray" onclick="moveOpp('oppGraveyard','oppDeck','${esc(iid)}',{bottom:true});showOppGraveModal()">デッキボトムへ戻す</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.opp.graveyard.find(x=>x.iid==='${esc(iid)}'),'oppGraveyard',true)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function showDeckModal() {
  document.getElementById('modal-title').textContent = `デッキ残り (${G.deck.length}枚) — 上から順`;
  if (!G.deck.length) {
    document.getElementById('modal-body').innerHTML = '<div class="zone-empty" style="padding:30px 0;">デッキが空です</div>';
  } else {
    const fromTop = [...G.deck].reverse();
    document.getElementById('modal-body').innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <button class="btn btn-gray btn-sm" onclick="shuffleDeck()">シャッフル</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,70px);gap:5px;padding:4px 0;">
        ${fromTop.map((c, i) => {
          const civ = CIV[c.civ] || CIV.fire;
          const pos = i === 0 ? 'トップ' : i === fromTop.length - 1 ? 'ボトム' : `${i + 1}枚目`;
          return `<div style="cursor:pointer;border-radius:5px;overflow:hidden;width:70px;position:relative;" onclick="deckAct('${esc(c.iid).replace(/'/g,"\\'")}','${esc(pos)}')" title="${esc(c.name)}（${pos}）">
            ${c.img
              ? `<img src="${esc(c.img)}" style="width:70px;height:98px;object-fit:cover;display:block;" onerror="this.style.opacity='.25'">`
              : `<div style="width:70px;height:98px;background:${civ.color};display:flex;align-items:center;justify-content:center;font-size:1.6rem;">${civ.emoji}</div>`}
            <div style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,.7);color:#fff;font-size:0.55rem;padding:1px 4px;border-radius:2px;">${i + 1}</div>
          </div>`;
        }).join('')}
      </div>`;
  }
  openModal();
}

function deckAct(iid, posLabel) {
  const c = G.deck.find(x => x.iid === iid);
  if (!c) return;
  document.getElementById('modal-title').textContent = `${c.name}（${posLabel}）`;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;margin-top:4px;">
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
        <button class="btn btn-gray btn-sm" onclick="showDeckModal()" style="align-self:flex-start;">← 戻る</button>
        <button class="btn btn-gray" onclick="move('deck','hand','${esc(iid)}');showDeckModal()">手札へ</button>
        <button class="btn btn-gray" onclick="move('deck','battleZone','${esc(iid)}');showDeckModal()">バトルゾーンへ</button>
        <button class="btn btn-gray" onclick="move('deck','manaZone','${esc(iid)}');showDeckModal()">マナゾーンへ</button>
        <button class="btn btn-gray" onclick="move('deck','shields','${esc(iid)}');showDeckModal()">シールドへ</button>
        <button class="btn btn-gray" onclick="move('deck','graveyard','${esc(iid)}');showDeckModal()">墓地へ</button>
        <button class="btn btn-gray" onclick="showCardDetail(G.deck.find(x=>x.iid==='${esc(iid)}'))">カード詳細</button>
        <button class="btn btn-orange" onclick="closeModal();enterUnderMode(G.deck.find(x=>x.iid==='${esc(iid)}'),'deck',false)">下に入れる...</button>
      </div>
      ${_actCardImg(c)}
    </div>`;
  openModal();
}

function openModal() { document.getElementById('ov').style.display = 'flex'; }
function closeModal(e) {
  if (e && e.target !== document.getElementById('ov')) return;
  document.getElementById('ov').style.display = 'none';
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LOG & TOAST                                             ║
// ╚══════════════════════════════════════════════════════════╝
function log(msg) {
  const box = document.getElementById('logBox');
  const t = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const d = document.createElement('div');
  d.className = 'log-line';
  d.innerHTML = `<span class="log-t">${t}</span>${esc(msg)}`;
  box.insertBefore(d, box.firstChild);
  while (box.children.length > 60) box.removeChild(box.lastChild);
}

function toast(msg, imgUrl) {
  const c = document.getElementById('toasts');
  const d = document.createElement('div');
  d.className = 'toast';
  if (imgUrl) {
    d.innerHTML = `<div class="toast-inner"><img class="toast-img" src="${esc(imgUrl)}"><span class="toast-text">${esc(msg).replace(/\n/g,'<br>')}</span></div>`;
  } else {
    d.innerHTML = `<span class="toast-text">${esc(msg).replace(/\n/g,'<br>')}</span>`;
  }
  c.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  UTIL                                                    ║
// ╚══════════════════════════════════════════════════════════╝
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CARD SEARCH (proxy)                                     ║
// ╚══════════════════════════════════════════════════════════╝
const PROXY = 'http://localhost:8765';
const SR_PER_PAGE = 24;
let _detailCache = {}; // cardId → card detail object
let _sr = { query: '', all: [], page: 0, proxyPage: 1, done: false, busy: false };

async function checkProxy() {
  try {
    const r = await fetch(`${PROXY}/ping`, { signal: AbortSignal.timeout(2000) });
    const d = await r.json();
    if (d.status === 'ok') {
      document.getElementById('proxy-dot').className = 'sdot on';
      document.getElementById('proxy-msg').textContent = 'プロキシ接続中 ✓';
      return true;
    }
  } catch {}
  document.getElementById('proxy-dot').className = 'sdot off';
  document.getElementById('proxy-msg').textContent = 'プロキシ未起動 → ターミナルで: python dm-proxy.py';
  return false;
}

async function doSearch() {
  const q = document.getElementById('search-q').value.trim();
  if (!q) return;
  _sr = { query: q, all: [], page: 0, proxyPage: 1, done: false, busy: false, total: null };
  document.getElementById('search-results').innerHTML = '<div class="sr-msg">検索中…</div>';
  await _srFetchAndRender();
}

async function _srFetchAndRender() {
  if (_sr.busy) return;
  _sr.busy = true;
  const el = document.getElementById('search-results');

  // Fetch one proxy page at a time; stop early if total is already known
  const need = (_sr.page + 1) * SR_PER_PAGE;
  while (_sr.all.length < need && !_sr.done) {
    // If we already know the total and have all cards, stop immediately
    if (_sr.total !== null && _sr.all.length >= _sr.total) {
      _sr.done = true;
      break;
    }
    try {
      const r = await fetch(
        `${PROXY}/search?q=${encodeURIComponent(_sr.query)}&page=${_sr.proxyPage}`,
        { signal: AbortSignal.timeout(20000) }
      );
      const d = await r.json();
      if (_sr.total === null && d.total != null) _sr.total = d.total;
      if (d.cards && d.cards.length > 0) {
        _sr.all.push(...d.cards);
        _sr.proxyPage++;
        // Stop loop after one fetch; let user click Next for more
        break;
      } else {
        _sr.done = true;
      }
    } catch (e) {
      el.innerHTML = `<div class="sr-msg" style="color:#f87171">エラー: プロキシを確認してください</div>`;
      _sr.busy = false;
      return;
    }
  }

  _sr.busy = false;
  _srRender();
}

function _srRender() {
  const el = document.getElementById('search-results');
  const start = _sr.page * SR_PER_PAGE;
  const slice = _sr.all.slice(start, start + SR_PER_PAGE);

  if (!slice.length) {
    el.innerHTML = '<div class="sr-msg">結果なし</div>';
    return;
  }

  const hasPrev = _sr.page > 0;
  const hasNext = _sr.total != null
    ? _sr.all.length < _sr.total
    : (start + SR_PER_PAGE) < _sr.all.length || !_sr.done;
  const total   = _sr.total != null ? _sr.total : (_sr.done ? _sr.all.length : '?');

  el.innerHTML = `
    <div class="sr-grid">${slice.map(c =>
      `<div class="sr-card" data-card-id="${esc(c.id)}" onclick="selectCard('${esc(c.id)}')" title="${esc(c.name)}">
        ${c.thumb
          ? `<img src="${esc(c.thumb)}" alt="${esc(c.name)}" loading="lazy" onerror="this.style.opacity='0.25'">`
          : `<div class="sr-thumb-ph" style="height:98px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:var(--text-dim);">?</div>`}
        <div class="sr-name">${esc(c.name)}</div>
      </div>`
    ).join('')}</div>
    <div class="sr-pager">
      <button class="btn btn-gray btn-xs" onclick="srPrev()" ${hasPrev ? '' : 'disabled'}>◀ 前へ</button>
      <span class="sr-page-info">${_sr.page + 1} ページ目 / 計 ${total} 件</span>
      <button class="btn btn-gray btn-xs" onclick="srNext()" ${hasNext ? '' : 'disabled'}>次へ</button>
    </div>`;

  // Background-load thumbnails for cards without one
  const noThumb = slice.filter(c => !c.thumb);
  if (noThumb.length) _srLoadThumbs(noThumb);
}

// Parallel background fetch of thumbnails for search result cards without one
function _srLoadThumbs(cards) {
  Promise.all(cards.map(async c => {
    const cached = _detailCache[c.id];
    if (cached?.img) { _setSrThumb(c.id, cached.img); return; }
    try {
      const r = await fetch(`${PROXY}/detail?id=${encodeURIComponent(c.id)}`,
                            { signal: AbortSignal.timeout(20000) });
      const d = await r.json();
      if (d.img) {
        _detailCache[c.id] = Object.assign(_detailCache[c.id] || {}, d);
        _setSrThumb(c.id, d.img);
        const entry = _sr.all.find(x => x.id === c.id);
        if (entry) entry.thumb = d.img;
      }
    } catch (_) {}
  }));
}

function _setSrThumb(cardId, imgUrl) {
  const card = document.querySelector(`.sr-card[data-card-id="${CSS.escape(cardId)}"]`);
  if (!card) return;
  const ph = card.querySelector('.sr-thumb-ph');
  if (!ph) return;
  const img = document.createElement('img');
  img.src = imgUrl;
  img.loading = 'lazy';
  img.onerror = () => { img.style.opacity = '0.25'; };
  ph.replaceWith(img);
}

function srPrev() {
  if (_sr.page > 0) { _sr.page--; _srRender(); }
}

async function srNext() {
  _sr.page++;
  const el = document.getElementById('search-results');
  const need = (_sr.page + 1) * SR_PER_PAGE;
  if (_sr.all.length < need && !_sr.done) {
    // Need to fetch more — show loading on pager only
    const pager = el.querySelector('.sr-pager');
    if (pager) pager.innerHTML = '<span class="sr-page-info">読み込み中…</span>';
    await _srFetchAndRender();
  } else {
    _srRender();
  }
}

async function selectCard(cardId) {
  document.getElementById('modal-title').textContent = '読み込み中…';
  document.getElementById('modal-body').innerHTML =
    '<div style="padding:30px;text-align:center;color:var(--text-dim);">📡 カード情報取得中…</div>';
  openModal();

  // Use cache if available
  if (_detailCache[cardId]) {
    _renderDetail(_detailCache[cardId]);
    return;
  }

  try {
    const r = await fetch(`${PROXY}/detail?id=${encodeURIComponent(cardId)}`,
                          { signal: AbortSignal.timeout(20000) });
    const c = await r.json();
    if (c.error) {
      document.getElementById('modal-body').innerHTML =
        `<div style="color:#f87171">取得失敗: ${esc(c.error)}</div>`;
      return;
    }
    _detailCache[cardId] = c;
    _renderDetail(c);
  } catch (e) {
    document.getElementById('modal-body').innerHTML =
      `<div style="color:#f87171">通信エラー: ${esc(e.message)}</div>`;
  }
}

function _renderDetail(c) {
  const civ = CIV[c.civ] || CIV.fire;
  const typeLabel =
    c.type === 'creature'  ? 'クリーチャー' :
    c.type === 'evolution' ? '進化クリーチャー' :
                             '呪文/呪文系';

  document.getElementById('modal-title').textContent = c.name;
  document.getElementById('modal-body').innerHTML = `
    <div class="detail-row">
      <img src="${esc(c.img)}" alt="${esc(c.name)}"
           onerror="this.style.background='${civ.color}';this.removeAttribute('src')">
      <table class="detail-tbl">
        <tr><td>文明</td>
            <td><span style="background:${civ.color};color:${civ.fg};padding:1px 9px;border-radius:10px;font-weight:700;">${civ.name}</span></td></tr>
        <tr><td>コスト</td><td>${c.cost}</td></tr>
        <tr><td>種類</td><td>${typeLabel}</td></tr>
        ${c.power ? `<tr><td>パワー</td><td>${c.power.toLocaleString()}</td></tr>` : ''}
        <tr><td>ID</td><td style="font-size:0.7rem;color:var(--text-dim)">${esc(c.id)}</td></tr>
      </table>
    </div>
    ${c.text ? `<div class="card-text">${esc(c.text)}</div>` : ''}
    <div class="detail-acts">
      <input id="detail-count" type="number" min="1" max="4" value="1"
             style="width:58px;padding:5px 6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);text-align:center;font-size:0.9rem;">
      <span style="color:var(--text-dim);font-size:0.82rem;">枚</span>
      <button class="btn btn-orange" onclick="addFromDetail('${esc(c.id)}',parseInt(document.getElementById('detail-count').value)||1);closeModal()">
        ＋ デッキに追加
      </button>
    </div>`;
}

function addFromDetail(cardId, count) {
  const c = _detailCache[cardId];
  if (!c) return;
  const card = {
    id: c.id, name: c.name, civ: c.civ, cost: c.cost,
    type: c.type, power: c.power || 0, img: c.img || '',
    race: c.race || '', text: c.text || '',
  };
  const n = Math.max(1, count || 1);
  const exist = deckCards.find(x => x.card.name === card.name);
  if (exist) {
    exist.count += n;
    toast(`${card.name} +${n}枚`);
  } else {
    deckCards.push({ card, count: n });
    toast(`${card.name} ${n}枚追加`);
  }
  renderDeck();
}

// ╔══════════════════════════════════════════════════════════╗
// ║  INIT                                                    ║
// ╚══════════════════════════════════════════════════════════╝
loadStorage();
checkProxy();
setInterval(checkProxy, 10000);
