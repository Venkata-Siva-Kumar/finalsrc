# finalsrc
with out firebase login kirana app

# Developer
Venkata Siva Kumar Mariyala

# Database
Aiven

# Database Hosting
render.com

# Application Type
Expo

# to generate .apk file
npm install -g eas-cli
eas build:configure
eas build -p android --profile preview

STEPS:
npm install -g eas-cli
```
Installs the Expo Application Services (EAS) CLI globally, so you can use EAS commands from anywhere on your system.
```

```
eas build:configure
```
Sets up your Expo project for EAS Build by creating or updating the `eas.json` configuration file.
```

```
eas build -p android --profile preview
```
Starts a cloud build for an Android app using the `preview` profile from your `eas.json`. After completion, you’ll get a link to download the `.apk` or `.aab` file.
```
