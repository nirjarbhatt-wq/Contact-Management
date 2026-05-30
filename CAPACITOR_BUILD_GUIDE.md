# Capacitor Build Guide — Contact Collection App

This guide explains how to build the Contact Collection app as a native **iOS** or **Android** app on your local machine using Capacitor. The Manus sandbox is used only for web development; native builds must be done locally.

---

## Prerequisites

| Tool | Version | Required For |
|------|---------|-------------|
| Node.js | 18 or later | Both |
| pnpm | 8 or later | Both |
| Xcode | 15 or later | iOS only (Mac required) |
| Android Studio | Hedgehog or later | Android |
| Apple Developer Account | Paid ($99/yr) | iOS App Store distribution |
| Google Play Console | Paid ($25 one-time) | Android Play Store distribution |

> **iOS requires a Mac.** Android builds can be done on Windows, Mac, or Linux.

---

## Step 1 — Clone or Download the Project

Download the project source code from the Manus Management UI (⋯ → Download as ZIP), then extract it and open a terminal inside the project folder.

```bash
cd contact-collection-app
pnpm install
```

---

## Step 2 — Set Environment Variables

Create a `.env` file in the project root with your backend credentials. Copy the values from the Manus project's Secrets panel:

```env
DATABASE_URL=<your TiDB connection string>
JWT_SECRET=<your JWT secret>
VITE_APP_ID=<your Manus OAuth App ID>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
OWNER_OPEN_ID=<your open ID>
OWNER_NAME=<your name>
BUILT_IN_FORGE_API_URL=<forge API URL>
BUILT_IN_FORGE_API_KEY=<forge API key>
VITE_FRONTEND_FORGE_API_KEY=<frontend forge key>
VITE_FRONTEND_FORGE_API_URL=<frontend forge URL>
```

> The app's backend is hosted on Manus at `https://contactapp-2llv2cmp.manus.space`. The native app shell calls this URL for all API requests, so you do not need to run a local server.

---

## Step 3 — Build the Web Assets

```bash
pnpm build
```

This produces the compiled web app in `dist/public/`, which Capacitor copies into the iOS and Android projects.

---

## Step 4 — Sync Capacitor

```bash
npx cap sync
```

This copies `dist/public/` into both `ios/App/App/public/` and `android/app/src/main/assets/public/`, and installs any native plugin dependencies.

> **Shortcut:** `pnpm cap:build` runs both `pnpm build` and `npx cap sync` in one command.

---

## Step 5A — iOS Build (Mac only)

### 5A.1 — Add iOS platform (first time only)

```bash
npx cap add ios
```

### 5A.2 — Add required Info.plist key

Open `ios/App/App/Info.plist` in Xcode or a text editor and add the contacts usage description inside the `<dict>` block:

```xml
<key>NSContactsUsageDescription</key>
<string>This app needs access to your contacts to let you tag and upload them to the shared database.</string>
```

### 5A.3 — Open in Xcode

```bash
npx cap open ios
```

### 5A.4 — Configure signing in Xcode

1. Select the `App` target in the Project Navigator.
2. Go to **Signing & Capabilities**.
3. Select your **Team** (Apple Developer account).
4. Set **Bundle Identifier** to `com.reciclartpl.contactcollection` (or your own ID).

### 5A.5 — Run on a device or simulator

- Select your device or a simulator from the toolbar.
- Press **⌘R** or click the Run button.

### 5A.6 — Archive for App Store

1. Select **Product → Archive**.
2. In the Organizer, click **Distribute App → App Store Connect**.
3. Follow the wizard to upload to App Store Connect.

---

## Step 5B — Android Build

### 5B.1 — Add Android platform (first time only)

```bash
npx cap add android
```

### 5B.2 — Open in Android Studio

```bash
npx cap open android
```

### 5B.3 — Verify permissions in AndroidManifest.xml

The `@capacitor-community/contacts` plugin automatically adds the required permissions. Verify that `android/app/src/main/AndroidManifest.xml` contains:

```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
```

### 5B.4 — Run on a device or emulator

- Connect a physical Android device (enable USB Debugging in Developer Options) or start an emulator.
- Click the **Run** button (green triangle) in Android Studio.

### 5B.5 — Build a release APK / AAB

1. In Android Studio: **Build → Generate Signed Bundle / APK**.
2. Choose **Android App Bundle** (recommended for Play Store) or **APK** (for direct distribution).
3. Create or select a keystore file and fill in the signing details.
4. The signed `.aab` or `.apk` will be saved to `android/app/release/`.

---

## Updating the App After Code Changes

Whenever you change the web code, repeat Steps 3 and 4, then rebuild in Xcode or Android Studio:

```bash
pnpm cap:build   # builds web assets and syncs to native projects
```

Then in Xcode press **⌘R**, or in Android Studio click **Run**.

---

## Live Reload During Development (Optional)

To see changes instantly on a physical device without rebuilding, uncomment the `server.url` block in `capacitor.config.ts` and set it to your local machine's IP address:

```ts
server: {
  url: "http://192.168.1.x:3000",  // replace with your machine's local IP
  cleartext: true,
},
```

Then run `pnpm dev` on your machine and open the app on the device. Changes to the web code will hot-reload instantly.

> **Remember to comment this block out again before building for production.**

---

## Contacts Permission Flow

On first launch, the app automatically calls `Contacts.requestPermissions()` when the user navigates to the **Add Contacts** page. The OS will show the standard system permission dialog. If the user denies access, a "Contacts permission denied" screen is shown with a **Retry** button that re-triggers the permission request.

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `npx cap sync` fails with "No Capacitor project found" | Run `npx cap add ios` and/or `npx cap add android` first |
| iOS build fails with "No team selected" | Set your Apple Developer team in Xcode Signing & Capabilities |
| Contacts list is empty on device | Ensure `NSContactsUsageDescription` is in Info.plist (iOS) or permissions are in AndroidManifest.xml (Android) |
| App shows sample contacts instead of real ones | The native bridge is not active — ensure you are running the Capacitor-wrapped build, not the web browser version |
| API calls fail on device | Verify the Manus backend is published and accessible at `https://contactapp-2llv2cmp.manus.space` |
