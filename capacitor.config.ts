import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "it.oroactive.app",
  appName: "OroActive",
  webDir: "ios-web",
  bundledWebRuntime: false,
  backgroundColor: "#000000",
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
    allowsLinkPreview: false,
    preferredContentMode: "mobile"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
      overlaysWebView: false
    },
    Camera: {
      permissions: ["camera", "photos"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_oroactive",
      iconColor: "#ff7a00"
    }
  },
  server: {
    cleartext: false,
    iosScheme: "capacitor"
  }
};

export default config;
