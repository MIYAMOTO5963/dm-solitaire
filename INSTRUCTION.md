# DM Solitaire - 実装指示書 v2

作成日: 2026-03-16（前回指示実行後のレビューを反映）

---

## 前回の指示（v1）の実施確認

| 項目 | 状態 | 備考 |
|---|---|---|
| Bug1: /deck/list, /deck/get をdo_GETに追加 | ✅ 完了（POSTに変更＋network-service.jsも更新）| GET→POST化でPIN保護が向上 |
| Bug2: Mobile SSEリコネクト修正 | ✅ 完了 | クリーンな再帰に書き直し |
| Bug3: BZプレビューのc参照 | ✅ 完了 | `escapeAttrJs(JSON.stringify(c))`で修正 |
| Bug4: ターン制御ガード | ✅ 完了 | `canActDesktopOnline()` / `canActMobileOnline()` 追加 |
| Feature A: 相手陣の視覚表示 | ✅ 完了 | カード裏面×N枚表示 |
| Feature B: ターン変更通知 | ✅ 完了 | 3秒トースト |
| Feature C: チャットUI | ✅ 完了 | デスクトップ=サイドバー、モバイル=折りたたみ |
| Feature D: 墓地トラッキング | ✅ 完了 | GameEngineに graveyard + moveToGraveyard追加 |
| Feature E: クラウド保存ボタン | ✅ 完了 | デッキ編集画面に追加 |

---

## 新規バグ（今回発見）

### Bug A: デスクトップ デッキ枚数カウントが間違い

**場所**: `ui-desktop.js` `updateDesktopDeckList()` 約 line 201
**症状**: `const count = cards?.length || 0;` はユニーク種類数を返す。`[{name:'X', count:3}]` のときは「1枚」と表示される。実際は3枚。
**修正**:
```javascript
const count = Array.isArray(cards)
  ? cards.reduce((s, c) => s + (c.count || 1), 0)
  : 0;
```

### Bug B: カード追加のHTML escapeが不正

**場所**: `ui-desktop.js` `desktopSearchCards()` 約 line 253
```javascript
// 現在（誤り）
onclick="addToDesktopDeck('${escapeHtml(JSON.stringify(card).replace(/'/g, "\\'"))}')"
// escapeHtml は " を &quot; に変換するが、JS文字列リテラルには不適切

// 修正後
onclick="addToDesktopDeck('${escapeAttrJs(JSON.stringify(card))}')"
```

### Bug C: ゲストプレイ時のオンライン名が空

**場所**: `index.html` `submitGuest()`
**症状**: ゲストが「ルームを作成」するとき、`window._ol.p1Name` が '' または 'Player 1' になる。
**修正**: ゲスト用のランダム名を生成する。
```javascript
function submitGuest() {
  const guestName = 'ゲスト_' + Math.floor(Math.random() * 9000 + 1000);
  AuthService.guestWithName(guestName); // AuthServiceにguestWithNameを追加
  // ...
}
// auth-service.js に追加:
guestWithName(name) {
  this._account = { username: name, pin: null, isGuest: true };
  sessionStorage.setItem('dm_account', JSON.stringify(this._account));
}
```

---

## UI/UX 改善（次の実装内容）

以下は優先度順。ユーザーが実際にどう使うかを想像して設計すること。

---

### UX-1【最優先】ゲームボードにカードの「タップ」操作を追加

**現状の問題**: デュエルマスターズではクリーチャーを「タップ」して攻撃・マナを「タップ」してコストを払うのが基本。現在のGameEngineにもUIにもタップの概念がない。一人回しツールとして最も重要な欠落。

**GameEngine への追加 (`game-engine.js`)**:
```javascript
// Card オブジェクトに tapped: false を追加（initGame時）
// battleZone / manaZone のカードをタップ/アンタップする
tapCard(zone, cardIndex) {
  const z = this.state[zone];
  if (!z || !z[cardIndex]) return false;
  this._saveState();
  z[cardIndex].tapped = !z[cardIndex].tapped;
  return true;
}

// ターン終了時に全カードをアンタップ
turnEnd() {
  this._saveState();
  this.state.turn++;
  // 自分のBZ・マナをアンタップ
  [...this.state.battleZone, ...this.state.manaZone].forEach(c => c.tapped = false);
}
```

**UI変更 (`ui-desktop.js` `renderDesktopGame`)**:
- バトルゾーン・マナゾーンのカードチップにクリックでタップ切り替え
- タップ中は視覚的に横向き（`transform: rotate(90deg)` または `opacity: 0.7` + ボーダー色変更）
```javascript
// 各カードチップに onclick追加
onclick="tapDesktopCard('battleZone', ${i})"

function tapDesktopCard(zone, idx) {
  engine.tapCard(zone, idx);
  if (window._ol) olSendActionDesktop('state');
  renderDesktopGame();
}
```

**モバイル (`ui-mobile.js`)**: 同様にタップ操作追加。

---

### UX-2【最優先】シールド破壊ボタンを追加

**現状の問題**: 攻撃してシールドを割る操作ができない。シールドカウンターが減らない。

**GameEngine への追加**:
```javascript
breakShield(targetShieldIndex = null) {
  // シールドがなければ何もしない
  if (this.state.shields.length === 0) return null;
  this._saveState();
  // 指定indexがなければ最初のシールドを割る
  const idx = (targetShieldIndex !== null && targetShieldIndex < this.state.shields.length)
    ? targetShieldIndex : 0;
  const [broken] = this.state.shields.splice(idx, 1);
  // 割ったカードはS・トリガーチェック後に手札へ（シミュレーターなので自動的に手札へ）
  this.state.hand.push(broken);
  return broken;
}
```

**UI変更**: シールドチップをクリックすると「シールド破壊 (手札に加える)」ボタンを表示するモーダルまたは確認ダイアログを出す。

---

### UX-3【高】PC版ゲームボードを全画面化

**現状の問題**: ゲームプレイ中も左カラムに検索パネルとデッキリストが表示される。ゲームに集中できるスペースが1/3しかない。

**実装方針**: ゲーム開始時にデッキ一覧画面から完全に切り替わるレイアウトにする。
- `renderDesktopDeckList()` → 3カラムレイアウト（現行通り）
- `renderDesktopGame()` → 全画面1カラム（または左に自分の手/BZ、右に相手エリア）

**具体的なレイアウト案（全画面ゲームビュー）**:
```
┌─────────────────────────────────────────────────┐
│  ターン5 | 自分のターン | [戻る] [ドロー] [ターン終了] │  ← ヘッダーバー
├──────────────────────┬──────────────────────────┤
│  相手エリア (opp)      │  チャット（オンライン時）   │
│  - 手札 N枚 (裏面)    │                          │
│  - BZ N枚 (裏面)      │                          │
│  - マナ N枚 (裏面)    │                          │
│  - シールド N枚        │                          │
├──────────────────────┤                          │
│  自分エリア            │                          │
│  - BZ（タップ可）      │  [送信][入力欄]           │
│  - マナ（タップ可）     │                          │
│  - シールド             │                          │
│  - 手札（横スクロール） │                          │
└──────────────────────┴──────────────────────────┘
```

実装:
- `renderDesktopGame()` 内で `container` を `app-desktop` 全体に設定し、`dl-root` グリッドの代わりに `dg-full-root` クラスを使う
- ヘッダーバーを固定表示にする

---

### UX-4【高】カードビジュアルの改善

**現状の問題**: 全カードが「3-4文字テキストのチップ」。カードらしさがなく何のカードかわからない。

**実装方針**: カードチップに最低限の情報を表示する。画像は使わなくてよい。

**カードチップのデザイン案**:
```html
<!-- 現在 -->
<div class="dg-card-chip battle">アポロ</div>

<!-- 改善後 -->
<div class="dg-card-chip battle fire ${tapped ? 'tapped' : ''}"
     title="${fullName}"
     onclick="tapDesktopCard(...)">
  <div class="dg-card-cost">7</div>       <!-- 左上にコスト -->
  <div class="dg-card-name">アポロ</div>  <!-- カード名（2行まで） -->
  <div class="dg-card-power">9000</div>  <!-- 下部にパワー -->
</div>
```

**CSSで文明ごとに背景色を変える**（index.html の style タグに追加）:
```css
.dg-card-chip.fire   { background: linear-gradient(135deg, #ffe0cc, #ffc9a0); border-color: #e08060; }
.dg-card-chip.water  { background: linear-gradient(135deg, #cce4ff, #a0c8f0); border-color: #6090c0; }
.dg-card-chip.light  { background: linear-gradient(135deg, #fffff0, #fffad0); border-color: #d0c060; }
.dg-card-chip.dark   { background: linear-gradient(135deg, #e0c0e0, #c890c8); border-color: #806080; }
.dg-card-chip.nature { background: linear-gradient(135deg, #d0eec0, #b0d890); border-color: #70a050; }
.dg-card-chip.multi  { background: linear-gradient(135deg, #ffe0a0, #e0c060); border-color: #c09030; }
.dg-card-chip.tapped { transform: rotate(25deg); opacity: 0.85; }
```

`card.civilization`（または`civ`）フィールドをクラスとして追加する。

---

### UX-5【高】モバイルのカードゾーン選択をボトムシートに変更

**現状の問題**: `confirm('バトルに配置? (OK: バトル, キャンセル: マナ)')` というブラウザのconfirmダイアログ。モバイルでは見た目が悪く、UXが断絶する。

**実装方針**: カードタップ → ボトムシートが下から出てくる → ゾーン選択ボタン

```javascript
function playMobileCard(idx) {
  if (window._ol && !canActMobileOnline()) {
    showMobileToast('相手のターンです');
    return;
  }
  showMobileCardActionSheet(idx);
}

function showMobileCardActionSheet(idx) {
  const card = engineMobile.state.hand[idx];
  // ボトムシートHTML生成
  const sheet = document.createElement('div');
  sheet.id = 'mobile-card-sheet';
  sheet.innerHTML = `
    <div class="mg-sheet-backdrop" onclick="closeMobileCardSheet()"></div>
    <div class="mg-sheet-body">
      <div class="mg-sheet-card-name">${escapeHtmlMobile(card.name)}</div>
      <div class="mg-sheet-actions">
        <button onclick="confirmPlayMobileCard(${idx},'battle')">バトルゾーンへ</button>
        <button onclick="confirmPlayMobileCard(${idx},'mana')">マナゾーンへ</button>
        <button onclick="closeMobileCardSheet()">キャンセル</button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
}
```

**CSS**:
```css
.mg-sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 900; }
.mg-sheet-body { position: fixed; bottom: 0; left: 0; right: 0; background: #fafbf9;
  border-radius: 16px 16px 0 0; padding: 20px; z-index: 901; }
.mg-sheet-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.mg-sheet-actions button { padding: 14px; border-radius: 8px; border: none;
  font-size: 1rem; cursor: pointer; background: var(--border); }
```

---

### UX-6【中】デッキ一覧ページのユーザー状態表示改善

**現状の問題**: ログインユーザー名がどこにも表示されない。ゲスト/ログイン済みの区別が不明。

**デスクトップ `renderDesktopDeckList()`**: ヘッダーにユーザー名を表示する。
```javascript
const account = AuthService.getCurrentAccount();
const userLabel = account?.isGuest
  ? `ゲスト (${account.username})`
  : account?.username || '';

// ヘッダーに追加
`<div class="dl-user-badge">${escapeHtml(userLabel)}</div>`
```

**モバイル `renderMobileDeckList()`**: ヘッダー右端にユーザー名+ログアウトボタン。

---

### UX-7【中】オンラインロビーのルームコード表示改善

**現状の問題**: ルームコードが作成されたあとの待機画面の視認性が低い。

**デスクトップ `desktopOnlineSetWaitingUi()`**:
- ルームコードを大きく表示（モノスペースフォント、フォントサイズ 2rem以上、文字間隔広め）
- 「コピー」ボタンを横に配置
- 待機アニメーション（点滅する「待機中...」）

**モバイルの待機UI**:
- 同様にコードを大きく表示
- ネイティブShare APIを使って共有できるようにする
```javascript
async function shareMobileRoomCode(code) {
  if (navigator.share) {
    await navigator.share({ title: 'DM Solitaire', text: `ルームコード: ${code}` });
  } else {
    navigator.clipboard.writeText(code);
    showMobileToast('コピーしました: ' + code);
  }
}
```

---

### UX-8【中】ターン開始時のアンタップ視覚フィードバック

**現状**: ターン終了ボタンを押すとターン数が増えるだけ。自分のターンになったとき、手動でドローする必要があることが分かりにくい。

**改善案**:
1. ターン終了ボタンのラベルを「ターン終了（相手にパス）」に変更
2. 自分のターン開始時（turn_endイベント受信 & active === 自分）に：
   - 「あなたのターン！ドローしてください」というバナーを表示
   - 「ドロー」ボタンを一時的に強調（点灯アニメーション）

---

### UX-9【中】検索結果にカード画像とコストを表示

**現状**: `desktopSearchCards()` は名前とtextのみ表示。

**改善後**:
- サムネイル画像（`card.thumb` が空でなければ表示）
- コスト・文明バッジ
- 検索結果を10件→20件に増やす（NetworkService.searchCardsのpage引数活用）
- 「もっと見る」ボタンで次のページを読み込む

---

### UX-10【低】デッキ保存時に40枚チェック

**現状**: 40枚を超えてもローカル保存できてしまう。

**`saveDesktopDeck()` と `saveMobileDeck()`**:
```javascript
function saveDesktopDeck() {
  const total = window._deckCards.reduce((s, c) => s + (c.count || 1), 0);
  if (total > 40) {
    if (!confirm(`デッキが${total}枚です（推奨40枚）。このまま保存しますか？`)) return;
  }
  if (total === 0) { alert('カードが入っていません'); return; }
  // ...既存の保存処理
}
```

---

### UX-11【低】モバイルのトースト通知

**現状**: `alert()` が多数残っている。モバイルでは `alert()` が画面全体を止めるので使い勝手が悪い。

**共通トースト関数を追加** (`ui-mobile.js`):
```javascript
function showMobileToast(msg, duration = 2500) {
  let el = document.getElementById('mg-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mg-toast';
    el.className = 'mg-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}
```

```css
.mg-toast {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: rgba(30,30,30,0.88); color: #fff; padding: 10px 20px;
  border-radius: 20px; font-size: 0.9rem; z-index: 9999;
  opacity: 0; transition: opacity 0.3s; pointer-events: none;
}
.mg-toast.show { opacity: 1; }
```

`alert('相手のターンです')` などを全て `showMobileToast(...)` に置き換える。

---

## 実装順序（推奨）

```
Phase 1（ゲーム機能を使えるようにする）:
  1. UX-1: タップ操作（GameEngine + デスクトップ + モバイル）
  2. UX-2: シールド破壊（GameEngine + UI）
  3. Bug A: デッキ枚数カウント修正
  4. Bug B: カード追加のescape修正

Phase 2（見た目・操作感の改善）:
  5. UX-3: デスクトップ全画面ゲームビュー
  6. UX-4: カードビジュアル（文明色 + コスト + パワー表示）
  7. UX-5: モバイルのボトムシート（confirmダイアログ廃止）
  8. UX-11: モバイルトースト（alertを全置換）

Phase 3（使いやすさ向上）:
  9. UX-6: ユーザー名表示
  10. UX-7: ルームコード待機UI改善
  11. UX-8: ターン開始フィードバック
  12. Bug C: ゲストプレイ名
  13. UX-9: 検索結果の改善
  14. UX-10: 40枚チェック
```

---

## ファイル別 変更サマリ

| ファイル | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| `game-engine.js` | tapCard, breakShield | – | – |
| `ui-desktop.js` | tap/shield追加, Bug修正 | 全画面化, カードビジュアル | 検索改善, ユーザー表示 |
| `ui-mobile.js` | tap/shield追加 | ボトムシート, トースト | ルームコード共有 |
| `index.html` | – | CSS追加（文明色, カードUI） | – |
| `auth-service.js` | – | – | guestWithName追加 |
| `network-service.js` | – | – | searchCards ページ対応 |

---

## 技術的前提（変更なし）

- サーバーURL: `window.DM_API_BASE`（index.htmlで設定）
- Railwayデプロイ: `https://dm-solitaire-production.up.railway.app`
- デッキ形式: `[{id, name, civ, civilization, cost, type, power, race, text, count}, ...]`
- SSEイベント: `opponent_state`, `turn_end`, `chat_message`, `ping`, `joined`
- `/deck/list`, `/deck/get` はPOST（PINをbodyに含める）
- 認証: sessionStorage に `{username, pin}` を保存
