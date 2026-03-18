/**
 * DM Solitaire - Authentication Service
 * ユーザー認証・セッション管理
 */

const AuthService = {
  // 現在のアカウント
  _account: null,

  /**
   * API ベースURL（NetworkService と共通）
   */
  _getApiBase() {
    return (typeof window !== 'undefined' && window.DM_API_BASE) || window.location.origin;
  },

  /**
   * アカウント情報をSessionStorageに保存
   * PINはメモリにのみ保持し、sessionStorageには書かない
   * @param {string} username
   * @param {string} pin
   */
  saveAccount(username, pin) {
    this._account = { username, pin };
    try {
      // PINは保存しない（平文流出防止）
      sessionStorage.setItem('dm_account', JSON.stringify({ username }));
    } catch (e) {
      console.error('SessionStorage保存失敗:', e);
    }
  },

  /**
   * SessionStorageからアカウント情報を読み込み
   * PINはメモリにしかないため、ページリロード後は needsReauth: true を返す
   * @returns {Object|null}
   */
  loadAccount() {
    try {
      const stored = sessionStorage.getItem('dm_account');
      if (!stored) { this._account = null; return null; }
      const parsed = JSON.parse(stored);
      // ゲストはPIN不要のためそのまま返す
      if (parsed.isGuest) {
        this._account = parsed;
        return this._account;
      }
      // メモリにPINが残っていればそれを使う（同一タブ内ページ遷移）
      if (this._account && this._account.username === parsed.username && this._account.pin) {
        return this._account;
      }
      // PINがない → 再認証が必要
      this._account = { username: parsed.username, pin: null, needsReauth: true };
      return this._account;
    } catch (e) {
      console.error('SessionStorage読み込み失敗:', e);
      return null;
    }
  },

  /**
   * アカウント情報クリア
   */
  clearAccount() {
    this._account = null;
    try {
      sessionStorage.removeItem('dm_account');
    } catch (e) {
      console.error('SessionStorage削除失敗:', e);
    }
  },

  /**
   * 現在のアカウント情報を取得
   * @returns {Object|null}
   */
  getCurrentAccount() {
    return this._account;
  },

  /**
   * ログイン（サーバー認証）
   * @param {string} username
   * @param {string} pin
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async login(username, pin) {
    try {
      const res = await fetch(`${this._getApiBase()}/profile/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: String(username).trim(), pin: String(pin).trim() })
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return {
          success: false,
          message: `サーバーエラー (${res.status})`
        };
      }

      if (res.ok && !data.error) {
        this.saveAccount(username, pin);
        return { success: true, message: 'ログイン成功' };
      }
      return {
        success: false,
        message: data.error || `ログイン失敗 (${res.status})`
      };
    } catch (error) {
      console.error('ログイン中にエラー:', error);
      return { success: false, message: 'ネットワークエラー: ' + error.message };
    }
  },

  /**
   * 新規登録
   * @param {string} username
   * @param {string} pin
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async register(username, pin) {
    try {
      const res = await fetch(`${this._getApiBase()}/profile/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: String(username).trim().slice(0, 20), pin: String(pin).trim() })
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return {
          success: false,
          message: `サーバーエラー (${res.status})`
        };
      }

      if (res.ok && !data.error) {
        this.saveAccount(username, pin);
        return { success: true, message: '登録成功' };
      }
      return {
        success: false,
        message: data.error || `登録失敗 (${res.status})`
      };
    } catch (error) {
      console.error('登録中にエラー:', error);
      return { success: false, message: 'ネットワークエラー: ' + error.message };
    }
  },

  /**
   * ゲストプレイ（名前付き）
   * @param {string} name
   */
  guestWithName(name) {
    const guestName = String(name || '').trim() || `ゲスト_${Math.floor(Math.random() * 9000 + 1000)}`;
    this._account = { username: guestName, pin: null, isGuest: true };
    try {
      sessionStorage.setItem('dm_account', JSON.stringify(this._account));
    } catch (e) {
      console.error('SessionStorage保存失敗:', e);
    }
  },

  /**
   * ゲストプレイ（アカウント不要）
   */
  guest() {
    this.guestWithName(`ゲスト_${Math.floor(Math.random() * 9000 + 1000)}`);
  },

  /**
   * ログアウト
   */
  logout() {
    this.clearAccount();
  }
};
