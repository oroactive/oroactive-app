(() => {
  const plugins = () => window.Capacitor?.Plugins || {};
  const isNative = () => Boolean(window.Capacitor?.isNativePlatform?.());

  async function callPlugin(pluginName, method, payload) {
    const plugin = plugins()[pluginName];
    if (!plugin?.[method]) return null;
    return plugin[method](payload);
  }

  async function configureIosChrome() {
    if (!isNative()) return;
    document.documentElement.classList.add("capacitor-native");
    if (document.body) document.body.classList.add("capacitor-native");
    else window.addEventListener("DOMContentLoaded", () => document.body?.classList.add("capacitor-native"), { once: true });
    await callPlugin("StatusBar", "setStyle", { style: "DARK" }).catch(() => {});
    await callPlugin("StatusBar", "setBackgroundColor", { color: "#000000" }).catch(() => {});
    await callPlugin("StatusBar", "setOverlaysWebView", { overlay: false }).catch(() => {});
    await callPlugin("SplashScreen", "hide").catch(() => {});
  }

  async function haptic(style = "LIGHT") {
    if (!isNative()) return;
    await callPlugin("Haptics", "impact", { style }).catch(() => {});
  }

  async function getPreference(key) {
    if (!isNative()) return localStorage.getItem(key);
    const result = await callPlugin("Preferences", "get", { key }).catch(() => null);
    return result?.value || "";
  }

  async function setPreference(key, value) {
    if (!isNative()) {
      localStorage.setItem(key, value);
      return;
    }
    await callPlugin("Preferences", "set", { key, value }).catch(() => localStorage.setItem(key, value));
  }

  async function removePreference(key) {
    if (!isNative()) {
      localStorage.removeItem(key);
      return;
    }
    await callPlugin("Preferences", "remove", { key }).catch(() => localStorage.removeItem(key));
  }

  async function nativeCameraDataUrl() {
    if (!isNative()) return null;
    const Camera = plugins().Camera;
    if (!Camera?.getPhoto) return null;
    const photo = await Camera.getPhoto({
      quality: 86,
      allowEditing: false,
      resultType: "dataUrl",
      source: "CAMERA",
      saveToGallery: false,
      correctOrientation: true,
      width: 1800,
      promptLabelHeader: "OroActive",
      promptLabelPhoto: "Scatta foto",
      promptLabelPicture: "Fotocamera"
    });
    return photo?.dataUrl || "";
  }

  async function nativePosition() {
    if (!isNative()) return null;
    const result = await callPlugin("Geolocation", "getCurrentPosition", {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 60000
    }).catch(() => null);
    if (!result?.coords) return null;
    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracy: result.coords.accuracy
    };
  }

  async function notify(title, body) {
    if (!isNative()) return;
    const LocalNotifications = plugins().LocalNotifications;
    if (!LocalNotifications?.schedule) return;
    await LocalNotifications.requestPermissions?.().catch(() => {});
    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now() % 2147483647,
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) },
        sound: "default"
      }]
    }).catch(() => {});
  }

  window.OroActiveNative = {
    isNative,
    configureIosChrome,
    haptic,
    getPreference,
    setPreference,
    removePreference,
    nativeCameraDataUrl,
    nativePosition,
    notify
  };

  configureIosChrome();
})();
