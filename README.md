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

# APK STEPS: 
To test implements code working as expected or to validate use teh below commands and genrate .apk file and validate the things , if things all are good then geneate .aab file and upload to appstore.

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

# AAB STEPS: 

eas build -p android --profile production


# in render
In render we have use the follwoing params
* Root Directory  as backend folder name i.e. backend (as per our application) its mentioned as optional but its mandatory
* Build Command : npm install
*  Start Command : npm start
# expo account commands 
eas logout
eas login

