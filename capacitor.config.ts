import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for Contact Collection App
 *
 * For LOCAL DEVELOPMENT (web preview):
 *   Leave `server.url` commented out — Capacitor will serve from the `webDir` bundle.
 *
 * For LIVE RELOAD during development (optional):
 *   Uncomment `server.url` and set it to your local machine's IP, e.g.:
 *   url: "http://192.168.1.x:3000"
 *
 * For PRODUCTION builds:
 *   Leave `server.url` commented out — the app will use the bundled web assets.
 *   The bundled app calls the backend at https://contactapp-2llv2cmp.manus.space
 */
const config: CapacitorConfig = {
  appId: "com.reciclartpl.contactcollection",
  appName: "Contact Collection",
  webDir: "dist/public",

  // Uncomment the block below for live-reload during development:
  // server: {
  //   url: "http://YOUR_LOCAL_IP:3000",
  //   cleartext: true,
  // },

  plugins: {
    // @capacitor-community/contacts — request permissions on first launch
    Contacts: {
      // No additional config needed; permissions are requested at runtime
    },
  },

  ios: {
    // Minimum iOS version supported by @capacitor-community/contacts v7
    deploymentTarget: "14.0",
    // Info.plist keys are added via Xcode or via ios/App/App/Info.plist
    // Required keys (add manually in Xcode → Info.plist):
    //   NSContactsUsageDescription  →  "This app needs access to your contacts to let you tag and upload them."
  },

  android: {
    // Minimum Android SDK supported by Capacitor 8
    minSdkVersion: 23,
    // Required permissions are added automatically by the plugin to AndroidManifest.xml
    // READ_CONTACTS and WRITE_CONTACTS will be requested at runtime
  },
};

export default config;
