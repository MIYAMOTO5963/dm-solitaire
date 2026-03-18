/**
 * DM Solitaire - App State
 * Centralized state store with legacy window key bridges.
 */

(function initAppState(global) {
  const DEFAULT_STATE = {
    _serverDeckNames: [],
    _deckEditing: null,
    _deckCards: [],
    _ol: null,
    _olDeckName: null,
    _olDeckData: null,
    _olOpponent: null,
    _olCurrentPlayer: null,
    _olStageName: null,
    _olChatLogDesktop: [],
    _olChatLogMobile: [],
    _vs: null
  };

  const listeners = new Map();

  function cloneDefaultState() {
    return {
      ...DEFAULT_STATE,
      _serverDeckNames: [],
      _deckCards: [],
      _olChatLogDesktop: [],
      _olChatLogMobile: []
    };
  }

  let state = cloneDefaultState();

  function notify(key, nextValue, prevValue) {
    const bag = listeners.get(key);
    if (!bag || !bag.size) return;
    bag.forEach((handler) => {
      try {
        handler(nextValue, prevValue);
      } catch (err) {
        console.error('AppState listener error:', err);
      }
    });
  }

  function get(key) {
    if (!key) return state;
    return state[key];
  }

  function set(key, value) {
    const prev = state[key];
    if (prev === value) return value;
    state[key] = value;
    notify(key, value, prev);
    notify('*', state, state);
    return value;
  }

  function patch(partial) {
    if (!partial || typeof partial !== 'object') return state;
    Object.keys(partial).forEach((key) => {
      set(key, partial[key]);
    });
    return state;
  }

  function reset(keys) {
    const defaults = cloneDefaultState();
    if (Array.isArray(keys) && keys.length) {
      keys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(defaults, key)) {
          set(key, defaults[key]);
        }
      });
      return state;
    }

    const prevState = state;
    state = defaults;
    Object.keys(defaults).forEach((key) => {
      notify(key, state[key], prevState[key]);
    });
    notify('*', state, prevState);
    return state;
  }

  function subscribe(key, handler) {
    if (typeof handler !== 'function') return () => {};
    const setForKey = listeners.get(key) || new Set();
    setForKey.add(handler);
    listeners.set(key, setForKey);

    return () => {
      const current = listeners.get(key);
      if (!current) return;
      current.delete(handler);
      if (!current.size) listeners.delete(key);
    };
  }

  global.AppState = {
    get,
    set,
    patch,
    reset,
    subscribe,
    snapshot: () => ({ ...state })
  };

  Object.keys(DEFAULT_STATE).forEach((key) => {
    const existingValue = global[key];
    if (existingValue !== undefined) {
      state[key] = existingValue;
    }

    const desc = Object.getOwnPropertyDescriptor(global, key);
    if (desc && desc.configurable === false) return;

    Object.defineProperty(global, key, {
      configurable: true,
      enumerable: false,
      get() {
        return get(key);
      },
      set(value) {
        set(key, value);
      }
    });
  });
})(window);
