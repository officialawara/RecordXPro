# RecordX Pro

RecordX Pro is a cross-platform (Android and iOS) mobile application that allows users to stream and record online video streams directly on their devices. It is designed to work seamlessly with native Share menus so users can pass URLs directly from their browser or other apps.

## Features
- **Video Streaming:** Play `.mp4`, `.m3u8` (HLS), and other supported streaming protocols.
- **Background Recording:** Download streams to your device's local storage securely in the background.
- **Native Share Integration:** Share a URL from your web browser directly to the app without copy-pasting.

## Prerequisites
- Node.js & npm (or yarn)
- React Native CLI environment set up
- Android Studio (for Android builds)
- Xcode (for iOS builds - macOS required)

## Getting Started

1. **Install Dependencies:**
   ```bash
   cd RecordXApp
   npm install
   ```

2. **Run on Android:**
   ```bash
   npm run android
   ```

3. **Run on iOS:**
   ```bash
   cd ios && pod install && cd ..
   npm run ios
   ```

## Native Setup Required

### iOS Share Extension
Because Apple restricts apps from directly reading network streams of other apps, we use a Share Extension. 

To configure the Share Extension on iOS:
1. Open `ios/RecordXApp.xcworkspace` in Xcode.
2. Go to **File -> New -> Target...**
3. Select **Share Extension**. Name it `ShareMenu`.
4. Ensure the deployment target matches your main app (e.g., iOS 13.0+).
5. Follow the configuration steps outlined in the [react-native-share-menu documentation](https://github.com/meedan/react-native-share-menu#ios-instructions).
   - This involves editing the `ShareViewController.swift` and configuring App Groups so the extension can pass the URL back to your React Native app securely.

### Android Setup
The Android configuration for receiving share intents is already completed in the `AndroidManifest.xml` and `MainActivity.kt`. No further configuration is needed!

## Contributing
This is an open-source project aimed at helping users manage media streams. Pull requests are welcome!

## License
MIT
