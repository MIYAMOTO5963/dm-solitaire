# DM Solitaire - 実装指示書 v3

作成日: 2026-03-16（v2実行後のレビューを反映）

---

## 前回の指示（v2）の実施確認

| 項目 | 状態 | 備考 |
|---|---|---|
| Bug A: デッキ枚数カウント | ✅ 完了 | `getDeckCardTotal()` ヘルパー関数として実装 |
| Bug B: escapeHtml in JSON | ✅ 完了 | `escapeAttrJs()` に正しく変更 |
| Bug C: ゲスト名なし | ✅ 完了 | `AuthService.guestWithName()` + random 4桁 |
| UX-1: タップ操作 | ✅ 完了 | `tapCard()`, `tapDesktopCard()`, `tapMobileCard()` |
| UX-2: シールド破壊 | ✅ 完了 | `breakShield()`, `breakDesktopShield()`, `breakMobileShield()` |
| UX-3: PC全画面ゲームビュー | ✅ 完了 | `dg-full-root` レイアウト |
| UX-4: カードビジュアル文明色 | ✅ 完了 | `.dg-card-chip.fire/.water/.light/.dark/.nature/.multi` |
| UX-5: モバイルボトムシート | ✅ 完了 | `openMobileHandActionSheet()`, `.mg-hand-sheet` |
| UX-6: ユーザー名表示 | ✅ 完了 | `getDesktopUserLabel()`, `getMobileUserLabel()` |
| UX-7: ルームコード改善 | ✅ 完了 | 大きなコード表示 + コピーボタン |
| UX-8: ターン開始フィードバック | ⚠️ 部分実装 | フラグ・CSS準備あり、実際のトリガーなし |
| UX-9: 検索結果改善 | ✅ 完了 | サムネイル・バッジ・もっと見るボタン |
| UX-10: 40枚チェック | ✅ 完了 | 保存時に confirm() で警告 |
| UX-11: モバイルトースト | ✅ 完了 | `showMobileToast()` 全面採用 |

---

## 新規バグ（今回発見）

### Bug 1: Desktop の alert() が多数残っている

**場所**: `ui-desktop.js`（確認済み18箇所）
**症状**: ターンガード、エラー通知、操作フィードバックで全て `alert()` を使用。モバイルは全て `showMobileToast()` に移行済みだが、デスクトップだけ取り残されている。

**主な箇所**:
```javascript
// 相手ターンガード（複数箇所）
if (window._ol && !canActDesktopOnline()) {
  alert('相手のターンです');  // ← 6箇所以上
  return;
}
// デッキ操作エラー
alert('デッキが取得できませんでした。...');
alert('デッキを保存しました');
alert('クラウドに保存しました。');
// オンライン接続エラー
alert('入力が不完全です...');
```

**修正方針**:
1. `ui-desktop.js` にトースト関数を追加:
```javascript
function showDesktopToast(message, type = 'info', duration = 2400) {
  let el = document.getElementById('dg-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dg-toast';
    el.className = 'dg-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `dg-toast ${type} show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}
```

2. CSS（`index.html` の `</style>` 前に追加）:
```css
.dg-toast {
  position: fixed; bottom: 24px; right: 24px;
  padding: 10px 18px; border-radius: 8px;
  font-size: 0.9rem; color: #fff; z-index: 9999;
  opacity: 0; transition: opacity 0.25s; pointer-events: none;
  max-width: 320px;
}
.dg-toast.show { opacity: 1; }
.dg-toast.info  { background: rgba(63,51,42,0.88); }
.dg-toast.ok    { background: rgba(60,120,80,0.92); }
.dg-toast.warn  { background: rgba(160,80,60,0.92); }
```

3. 全 `alert(...)` を `showDesktopToast(...)` に置き換え（型: warn/ok/info）:
   - `'相手のターンです'` → `showDesktopToast('相手のターンです', 'warn')`
   - `'デッキを保存しました'` → `showDesktopToast('保存しました', 'ok')`
   - `'クラウドに保存しました。'` → `showDesktopToast('クラウドに保存しました', 'ok')`
   - ゲーム開始エラー → `showDesktopToast('...', 'warn')`

---

### Bug 2: Desktop/Mobile の confirm() をモーダルへ

**場所**: `ui-desktop.js` 行759（削除確認）、行926（40枚超過）、`ui-mobile.js` 行752（削除確認）
**症状**: `confirm()` はブラウザのネイティブダイアログでテーマに合わない。特にデスクトップの削除確認でスタイルが崩れる。

**修正方針**: ミニモーダルコンポーネントを作成する。

```javascript
// ui-desktop.js / ui-mobile.js 共通パターン（各ファイルに実装）
function showDesktopConfirmDialog(message, onOk, onCancel = null) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dm-confirm-backdrop';
  backdrop.innerHTML = `
    <div class="dm-confirm-box">
      <div class="dm-confirm-msg">${escapeHtml(message)}</div>
      <div class="dm-confirm-btns">
        <button class="dm-confirm-ok">OK</button>
        <button class="dm-confirm-cancel">キャンセル</button>
      </div>
    </div>
  `;
  backdrop.querySelector('.dm-confirm-ok').onclick = () => {
    document.body.removeChild(backdrop);
    onOk?.();
  };
  backdrop.querySelector('.dm-confirm-cancel').onclick = () => {
    document.body.removeChild(backdrop);
    onCancel?.();
  };
  document.body.appendChild(backdrop);
}
```

CSS:
```css
.dm-confirm-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 9000;
}
.dm-confirm-box {
  background: var(--panel, #f6efe6); border-radius: 12px;
  padding: 24px 28px; max-width: 340px; width: 90%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
}
.dm-confirm-msg { font-size: 1rem; color: var(--text, #3f332a); margin-bottom: 18px; }
.dm-confirm-btns { display: flex; gap: 10px; justify-content: flex-end; }
.dm-confirm-ok { background: var(--accent, #b37a4c); color: #fff;
  border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.dm-confirm-cancel { background: var(--border, #e2d6c8); color: var(--text, #3f332a);
  border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
```

**使用例（デッキ削除）**:
```javascript
// 変更前
function deleteDesktopDeck(name) {
  if (!confirm('削除してよろしいですか？')) return;
  // ...
}

// 変更後
function deleteDesktopDeck(name) {
  showDesktopConfirmDialog(`「${name}」を削除しますか？`, () => {
    const decks = getSavedDecks();
    delete decks[name];
    localStorage.setItem('dm_decks', JSON.stringify(decks));
    updateDesktopDeckList();
    showDesktopToast('デッキを削除しました', 'ok');
  });
}
```

---

## ページデザイン改善（今回の重点）

以下は優先度順。「ユーザーが実際にどう見るか」を基準に設計する。

---

### Design-1【最優先】オンラインロビーの配色をアプリ全体に統一

**現状の問題**: オンラインロビー（`.dol-root`）が暗い紺色・深紅の独自テーマを持っており、アプリの他画面（ベージュ×ブラウン）と全く異なる雰囲気になっている。ユーザーが「別のアプリに飛んだ」と感じる。

**現在の配色**:
```css
/* .dol-root */
background: linear-gradient(118deg, #18334e 0%, #1a2d42 45%, #4e2a32 100%);  /* 深紺×深紅 */
color: #f1e4ca;
font-family: 'Yu Mincho', ..., serif;

/* .dol-owner */
background: linear-gradient(180deg, rgba(33,65,98,0.96)...);  /* 濃紺 */
/* .dol-guest */
background: linear-gradient(180deg, rgba(76,39,48,0.95)...);  /* 深紅 */
```

**修正方針**: `.dol-root` をアプリのテーマカラーに合わせる。ロビーらしさは維持しつつ統一する。

```css
/* 変更後 (index.html の .dol-root 以下) */
.dol-root {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(320px, 1fr) minmax(240px, 280px);
  gap: 12px;
  min-height: 100vh;
  padding: 16px;
  background: var(--bg);          /* #f6efe6 に統一 */
  color: var(--text);              /* #3f332a */
  font-family: inherit;            /* Yu Mincho → 通常フォントに */
  overflow: auto;
}

.dol-panel {
  border-radius: 12px;
  padding: 18px;
  background: var(--panel);       /* #faf6f1 */
  border: 1px solid var(--border); /* #e2d6c8 */
  display: flex; flex-direction: column; gap: 10px;
}

/* OWNER / GUEST バッジも統一 */
.dol-owner .dol-badge-title { color: var(--accent); }  /* #b37a4c */
.dol-guest .dol-badge-title { color: #7a6a5a; }

.dol-create-btn {
  background: var(--accent);
  color: #fff;
  /* 以下は現状のまま */
}
.dol-create-btn.is-waiting {
  background: var(--text-dim);
}
```

**補足**: `dol-head-kicker`, `dol-head-title`, `dol-room-code`, `dol-stat-box` なども白/ベージュベースに統一すること。`color: #f1e4ca` など白系の文字色は全て削除し `var(--text)` に変更。

---

### Design-2【最優先】UX-8の完成: ターン開始ドロー促進

**現状**: `_desktopNeedDrawGuide` フラグと `dg-btn.guide` のCSS準備はあるが、実際にフラグをセットするロジックがなくドローボタンが光らない。

**修正箇所** (`ui-desktop.js` の SSE イベントハンドラ内):
```javascript
// turn_end イベント受信時（olStartEventListenerDesktop の中）
es.addEventListener('turn_end', (e) => {
  const data = JSON.parse(e.data || '{}');
  // ... existing logic for updating _olCurrentPlayer ...
  const myNum = window._ol.p === 'p1' ? 1 : 2;
  if (window._olCurrentPlayer === myNum) {
    // 自分のターンになった
    window._desktopNeedDrawGuide = true;    // ← ここを追加
    showDesktopTurnNotification('あなたのターン！ドローしてください');
  }
  renderDesktopGame();
});
```

同様に `ui-mobile.js` の SSE ハンドラでも:
```javascript
if (window._olCurrentPlayer === myNum) {
  window._mobileNeedDrawGuide = true;      // ← ここを追加
  showMobileTurnNotification('あなたのターン！ドローしてください');
}
```

**ドロー後にフラグを解除** (`drawDesktopCard()` の中):
```javascript
function drawDesktopCard() {
  // ... existing guard ...
  window._desktopNeedDrawGuide = false;    // ← ここを追加
  engine.drawCard();
  if (window._ol) olSendActionDesktop('state');
  renderDesktopGame();
}
```

**一人回し時も**: ターン終了ボタンを押したら自分のターン開始なので:
```javascript
function turnDesktopEnd() {
  // ... existing guard ...
  engine.turnEnd();
  if (window._ol) {
    olSendActionDesktop('turn_end');
  } else {
    window._desktopNeedDrawGuide = true;   // 一人回し時も促進
  }
  renderDesktopGame();
}
```

---

### Design-3【高】手札カードへの文明色適用

**現状の問題**: BZ・マナゾーンのカードは文明色（`.fire`, `.water` 等）が表示されるが、手札のカードは `linear-gradient(145deg, #b8c8d0...)` の固定青グラデーション。同じカードが手札とBZで別の色に見え、コンテキストが失われる。

**修正** (`ui-desktop.js` の `renderDesktopGame()` 内、手札レンダリング部分):
```javascript
// 変更前（手札チップ）
`<div class="dg-card-chip hand" ...>`

// 変更後: renderChip() を手札にも使う（または hand チップに civ クラスを追加）
${state.hand.map((c, i) => {
  const civ = getDesktopCardCivClass(c);  // 既存関数を流用
  return `
    <div class="dg-card-chip hand ${civ}" ...>
      <div class="dg-card-cost">${c.cost ?? ''}</div>
      <div class="dg-card-name">${escapeHtml(c.name).substring(0, 6)}</div>
    </div>
  `;
}).join('')}
```

**CSS変更** (`index.html`): `.dg-card-chip.hand` の固定背景を文明色で上書きできるように変更。

```css
/* 現在: hand は固定背景 */
.dg-card-chip.hand {
  background: linear-gradient(145deg, #b8c8d0 0%, #c8d4dc 100%);
  /* ... */
}

/* 変更後: hand + civ でグラデーション上書き */
.dg-card-chip.hand.fire   { background: linear-gradient(160deg, #fff2ea, #f9d8c7); border-color: #d16f44; }
.dg-card-chip.hand.water  { background: linear-gradient(160deg, #eef5ff, #cfe2fb); border-color: #4f86c5; }
.dg-card-chip.hand.nature { background: linear-gradient(160deg, #eef8ee, #cfe8ce); border-color: #5b9a5a; }
.dg-card-chip.hand.light  { background: linear-gradient(160deg, #fff9e8, #f7eec6); border-color: #c2ad62; }
.dg-card-chip.hand.dark   { background: linear-gradient(160deg, #f5f1fa, #ddd1ea); border-color: #6c5a7e; }
.dg-card-chip.hand.multi  { background: linear-gradient(160deg, #f4f6f8, #dfe4e8); border-color: #8d969c; }
```

**モバイル `ui-mobile.js` も同様に** `renderMobileGame()` の手札チップに civ クラスを追加する。

---

### Design-4【高】デスクトップ デッキ一覧の空状態と情報量の改善

**現状の問題**:
1. デッキが0件のとき、`desktop-deck-list` の中身が空欄のまま（案内文なし）
2. デッキアイテムにカード枚数しか表示されない（文明構成が見えない）
3. クラウドデッキが下に追加表示されるが区切りがない

**改善 A: 空状態の表示** (`updateDesktopDeckList()` 内):
```javascript
if (Object.keys(savedDecks).length === 0 && !window._serverDeckNames?.length) {
  deckList.innerHTML = `
    <div class="dl-empty-state">
      <div class="dl-empty-icon">📋</div>
      <div class="dl-empty-title">デッキがありません</div>
      <div class="dl-empty-desc">「新規デッキ」ボタンからデッキを作成してください。<br>カード検索でカードを追加できます。</div>
    </div>
  `;
  return;
}
```

CSS:
```css
.dl-empty-state { text-align: center; padding: 40px 16px; color: var(--text-dim); }
.dl-empty-icon  { font-size: 2.5rem; margin-bottom: 12px; }
.dl-empty-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; color: var(--text); }
.dl-empty-desc  { font-size: 0.86rem; line-height: 1.6; }
```

**改善 B: デッキアイテムに文明バッジを表示** (`updateDesktopDeckList()` 内):
```javascript
// 文明集計
const civSummary = {};
cards.forEach(c => {
  const civ = c.civilization || c.civ || 'multi';
  civSummary[civ] = (civSummary[civ] || 0) + (c.count || 1);
});
const civBadges = Object.entries(civSummary)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([civ, n]) =>
    `<span class="dl-civ-badge ${civ}" title="${getCivLabel(civ)}: ${n}枚"></span>`
  ).join('');

// HTMLに追加
`<div class="dl-deck-meta">${count}枚 <span class="dl-civ-badges">${civBadges}</span></div>`
```

CSS:
```css
.dl-civ-badge {
  display: inline-block; width: 10px; height: 10px;
  border-radius: 50%; margin-right: 3px; vertical-align: middle;
  border: 1.5px solid rgba(0,0,0,0.15);
}
.dl-civ-badge.fire   { background: #e87c50; }
.dl-civ-badge.water  { background: #5090d0; }
.dl-civ-badge.nature { background: #5ea858; }
.dl-civ-badge.light  { background: #c8b040; }
.dl-civ-badge.dark   { background: #8060a8; }
.dl-civ-badge.multi  { background: #909090; }
```

**モバイル `renderMobileDeckList()` も同様に** 空状態と文明バッジを追加する。

---

### Design-5【高】ゲームボード ゾーンの視認性向上

**現状の問題**: ゾーン間の区切りが薄く、どこが何のゾーンか瞬時に判断しにくい。特にBZ・マナ・シールドが縦に並ぶモバイル版で顕著。

**改善 A: ゾーンラベルの強化** (index.html CSS):
```css
/* デスクトップ */
.dg-zone-title {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 2px 6px;
  border-left: 3px solid var(--accent);  /* ← アクセント縦線を追加 */
  margin-bottom: 6px;
}

/* モバイル */
.mg-zone-title {
  border-left: 3px solid var(--accent);
  padding-left: 6px;
}
```

**改善 B: 空ゾーンのプレースホルダー**:
```css
/* バトルゾーン・マナゾーンが空のとき */
.dg-play-zone:empty::after, .mg-card-grid:empty::after {
  content: 'カードなし';
  display: block;
  color: var(--text-dim);
  font-size: 0.78rem;
  padding: 12px;
  opacity: 0.5;
}
```

**改善 C: デスクトップ全画面ビューのレイアウト調整**

現状の `dg-full-body` (ゲーム画面本体) はオンライン時に横2カラムになっているが、高さの配分が不明確。以下を追加:
```css
.dg-full-body {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  display: grid;
  gap: 12px;
  /* solo mode */
  grid-template-rows: auto auto auto auto auto;
}

/* オンライン時は相手エリア上部固定、自分エリア下部 */
.dg-full-body.online-mode {
  grid-template-rows: minmax(100px, auto) 4px minmax(200px, auto);
  /* 相手 | 区切り線 | 自分 */
}

/* 相手エリアと自分エリアの間の視覚的区切り */
.dg-battle-divider {
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 2px;
  margin: 4px 0;
}
```

---

### Design-6【中】モバイル版ゲームボードのゾーン順序見直し

**現状**: 上から「BZ → マナ → シールド → 墓地 → (手札dock) → アクション」の順番。

**問題**: 実際のゲームでは「シールド」が最も重要なステータス情報（残り何枚か）。墓地は参考情報。手札dock は固定表示で良い。現在の順番では重要なシールドが見えにくい。

**改善案（ゾーン順の変更）**:
```
[ヘッダー: ターン | 自分のターン/相手のターン]
[相手エリア（オンライン時）]
─────────────────────────────
[シールドゾーン]  ← 最上部（最重要ステータス）
[BZゾーン]
[マナゾーン]
[墓地ゾーン]     ← 折りたたみ可
─────────────────────────────
[手札dock（固定下部）]
[アクションボタン]
```

**具体的変更** (`renderMobileGame()` 内のHTMLの順序を変更するだけ): シールドセクションを BZ の前に移動する。

---

### Design-7【中】デスクトップ全画面ゲームビューのヘッダーバー改善

**現状の問題**: ゲームヘッダーバーにターン数と状態は表示されているが、「自分のターン」「相手のターン」の視覚的強調が弱い。ターンボタン群も無機質。

**改善**: ターン状態をバーの背景色で表現する。

```javascript
// renderDesktopGame() の中でヘッダーに class を付与
const headerClass = isMyTurn ? 'dg-header-bar my-turn' : 'dg-header-bar opp-turn';
// HTML:
`<div class="${headerClass}">
  <span class="dg-turn-label">ターン ${state.turn}</span>
  <span class="dg-turn-badge">${isMyTurn ? '自分のターン' : '相手のターン'}</span>
  ...buttons...
</div>`
```

CSS:
```css
.dg-header-bar {
  padding: 10px 16px;
  display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid var(--border);
  transition: background 0.4s;
}
.dg-header-bar.my-turn {
  background: linear-gradient(90deg, rgba(179,122,76,0.12), transparent);
  border-bottom-color: var(--accent);
}
.dg-header-bar.opp-turn {
  background: transparent;
}
.dg-turn-badge {
  font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 4px;
}
.dg-header-bar.my-turn .dg-turn-badge {
  background: var(--accent); color: #fff;
}
.dg-header-bar.opp-turn .dg-turn-badge {
  background: var(--border); color: var(--text-dim);
}
```

---

### Design-8【低】墓地ビューアの改善

**現状**: 墓地は小さいチップで10〜12枚しか表示されない。大量にあると見えない。

**改善案**: 墓地エリアをクリックで展開する「モーダル墓地ビューア」を追加。

```javascript
function showDesktopGraveyardModal() {
  const state = engine.getState();
  if (!state.graveyard.length) return;

  const modal = document.createElement('div');
  modal.className = 'dm-modal-backdrop';
  modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };
  modal.innerHTML = `
    <div class="dm-modal">
      <div class="dm-modal-title">墓地 (${state.graveyard.length}枚)</div>
      <div class="dm-modal-cards">
        ${state.graveyard.map((c, i) => {
          const civ = getDesktopCardCivClass(c);
          return `
            <div class="dm-modal-card ${civ}">
              <div class="dg-card-cost">${c.cost ?? ''}</div>
              <div class="dg-card-name">${escapeHtml(c.name)}</div>
              <button onclick="returnDesktopFromGraveyardIdx(${i})" class="dm-modal-return">手札へ</button>
            </div>
          `;
        }).join('')}
      </div>
      <button onclick="document.body.removeChild(document.querySelector('.dm-modal-backdrop'))"
        class="dm-modal-close">閉じる</button>
    </div>
  `;
  document.body.appendChild(modal);
}
```

CSS:
```css
.dm-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 8000;
}
.dm-modal {
  background: var(--panel); border-radius: 14px; padding: 20px;
  max-width: 580px; width: 92%; max-height: 80vh;
  overflow-y: auto; box-shadow: 0 16px 48px rgba(0,0,0,0.25);
}
.dm-modal-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; }
.dm-modal-cards { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.dm-modal-card {
  width: 60px; height: 80px; border-radius: 6px;
  border: 1px solid var(--border); font-size: 0.6rem;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; text-align: center; padding: 3px; cursor: pointer;
  position: relative;
}
.dm-modal-return {
  position: absolute; bottom: 2px; right: 2px;
  font-size: 0.55rem; background: var(--accent); color: #fff;
  border: none; border-radius: 3px; padding: 2px 4px; cursor: pointer;
}
.dm-modal-close { background: var(--border); border: none; border-radius: 8px;
  padding: 8px 20px; cursor: pointer; font-size: 0.9rem; }
```

墓地エリアのタイトルをクリック可能にする:
```javascript
// renderDesktopGame() の墓地セクション
`<strong class="dg-zone-title" style="cursor:pointer" onclick="showDesktopGraveyardModal()">
  墓地 (${state.graveyard.length}) ▾
</strong>`
```

モバイル版も同様に `showMobileGraveyardModal()` を追加する。

---

## 実装順序（推奨）

```
Phase 1（バグと通知の統一）:
  1. Bug 1: showDesktopToast() 追加 + alert() 全置換
  2. Design-2: ターン開始ドロー促進（_desktopNeedDrawGuide, _mobileNeedDrawGuide）
  3. Bug 2: confirm() → showDesktopConfirmDialog() に変更

Phase 2（ページデザイン統一）:
  4. Design-1: オンラインロビー配色統一（dol-root → var(--bg) テーマ）
  5. Design-3: 手札カードへの文明色適用（desktop + mobile）
  6. Design-4: デッキ一覧 空状態 + 文明バッジ

Phase 3（ゲームボードの視認性）:
  7. Design-5: ゾーンラベル強化 + 空プレースホルダー + divider
  8. Design-6: モバイル ゾーン順序変更（シールドを上部に）
  9. Design-7: デスクトップ ヘッダーバー ターン状態の色
  10. Design-8: 墓地モーダルビューア（desktop + mobile）
```

---

## ファイル別 変更サマリ

| ファイル | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| `ui-desktop.js` | showDesktopToast追加, alert全置換, confirm置換, drawGuideフラグ | 手札civ, 空状態, 文明バッジ | ヘッダーバー改善, 墓地モーダル |
| `ui-mobile.js` | mobileNeedDrawGuide フラグ | 手札civ, 空状態, 文明バッジ | ゾーン順変更, 墓地モーダル |
| `index.html` | .dg-toast CSS | .dol-root 配色, .dl-civ-badge, .dg-card-chip.hand.fire | .dg-zone-title border, .dm-modal, .dm-confirm CSS |

---

## 技術的前提（変更なし）

- サーバーURL: `window.DM_API_BASE`（index.htmlで設定）
- Railwayデプロイ: `https://dm-solitaire-production.up.railway.app`
- デッキ形式: `[{id, name, civ, civilization, cost, type, power, race, text, count}, ...]`
- SSEイベント: `opponent_state`, `turn_end`, `chat_message`, `ping`, `joined`
- `/deck/list`, `/deck/get` はPOST（PINをbodyに含める）
- 認証: sessionStorage に `{username, pin}` を保存
- テーマカラー: `--bg: #f6efe6`, `--accent: #b37a4c`, `--text: #3f332a`, `--border: #e2d6c8`
