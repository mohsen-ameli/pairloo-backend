# Get started

1. Install Mongosh
   Follow your distribution's package manager to install and run MongoDB.
   By the end you should be able to run

```bash
mongosh
```

and get a working MongoDB client.

2. Install emulator
   If you're not on a Mac, you can only emulate android by installing Android Studio.
   If you're on a Mac, set up an iOS emulator. Follow the instructions on Expo or React Native
   on how to setup an iOS emulator.
   Use "Android 35 Vanilla Icecream" for Android emulation.

3. Install dependencies

```bash
npm install
```

4. Setup .env

First copy .env.example to a new file .env

Run the following command to generate a random key, used to hash JWTs.
(if on Windows go to https://secretkeygen.vercel.app/ and get a random string there)

```bash
openssl rand -base64 50
```

And copy the contents into the backend's .env JWT_SECRET

Next, go to https://console.cloud.google.com/
and make a new oAuth 2.0 client.
Make a new web application and for the "authorized javascript origins",
put the frontend url "http://localhost:3000"
and for "authorized redirect URIs" put the backend url
"http://localhost:8000/api/auth/callback"
Change ports accordingly.

For sending emails, one way is to use Google's gmail.
go to "https://myaccount.google.com/apppasswords"
and make a new app. Name doesn't matter. Copy the app password into EMAIL_PASS in .env
set EMAIL_HOST to "smtp.gmail.com" and EMAIL_USER to your email address

To connect to gemini, go to https://aistudio.google.com/ and create an account.
Then make an API key and put the value in GEMINI_API_KEY

4. Start the backend server

```bash
npm run dev
```

5. Start your emulator
   Run the included start-emulator.sh bash script. Make sure it is executable by running the following

```bash
chmod u+x start-emulator.sh
```

Run the emulator. If you want to do a cold boot, if things are not working well from a loaded state, do

```
./start-emulator.sh -c
```

(Note: if you use different ports other than 3000 and 8000 for frontend and backend respectively, then idk what to tell you.)

# Notes:

If you want clear out the port forwards, run the following

```bash
adb reverse --remove-all
```
