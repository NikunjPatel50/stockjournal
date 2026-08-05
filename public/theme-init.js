(function () {
  var STORAGE_KEY = "swingtradinglog-theme";
  var GUEST_SETTINGS_KEY = "tradetracker_settings_guest_v1";
  var LEGACY_SETTINGS_KEY = "tradetracker_settings_v1";
  var DEFAULT_THEME = "dark";

  function readJsonTheme(raw) {
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (parsed === "light" || parsed === "dark" || parsed === "system") return parsed;
      if (parsed && parsed.display && parsed.display.theme) return parsed.display.theme;
    } catch (e) {}
    return null;
  }

  function readSettingsTheme() {
    var keys = [GUEST_SETTINGS_KEY, LEGACY_SETTINGS_KEY];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf("swingtradinglog_settings_v1_") === 0) keys.push(key);
    }
    for (var j = 0; j < keys.length; j++) {
      var theme = readJsonTheme(localStorage.getItem(keys[j]));
      if (theme) return theme;
    }
    return null;
  }

  function resolveTheme(preference) {
    if (preference === "system" || !preference) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return preference;
  }

  try {
    var stored = readJsonTheme(localStorage.getItem(STORAGE_KEY));
    var settingsTheme = readSettingsTheme();
    var preference = stored || settingsTheme || DEFAULT_THEME;
    if (stored && settingsTheme && stored !== settingsTheme) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    var resolved = resolveTheme(preference);
    var root = document.documentElement;
    root.classList.remove("light", "dark");
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
