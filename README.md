## Get started

1. Install dependencies

```bash
npm install
```

2. Port forward from emulator to host. This is so that Google OAuth can
   redirect to localhost:8000 and hit our server end point running on the host machine

```bash
adb reverse tcp:8000 tcp:8000
```

If you want clear out the port forwards, run the following

```bash
adb reverse --remove-all
```

3. Start the app

```bash
npm run dev
```
