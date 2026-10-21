# Pebble

Pebble is a shared to-do list for your phone, with a little pet that lives with the lists.

You can make lists, tick tasks off, and invite someone else with a short code. When either of you changes a task, the other person sees it. Finishing a task gives you coins. You spend coins in a shop on hats, plants, furniture, and rooms for the pet. An AI assistant can also read and change your tasks if you give it a key.

The everyday app runs in **Expo Go**, which is free on the iPhone App Store and on Google Play. You do not need a Mac, and you do not need to pay Apple.

## What you need

- A Windows computer (a Mac works too, the same commands).
- Node.js **22 or newer**. Download the LTS installer from [https://nodejs.org](https://nodejs.org). After it installs, open PowerShell and type `node -v`. You should see v22 or higher.
- Your iPhone and the computer on the **same Wi-Fi**. Guest Wi-Fi and mobile data usually block this.
- The free **Expo Go** app from the App Store. Update it if you already have it. This project uses Expo SDK 54, which is the version in the App Store copy of Expo Go.

You do not need an Apple Developer account for this path. You do not need Android Studio either, unless you want the floating pet that walks over other Android apps.

## Run it on your computer

1. Download this project (the green **Code** button, then **Download ZIP**) and unzip it. Or, if you use Git: `git clone` the repository and open that folder.
2. Open PowerShell in the project folder. In File Explorer you can click the address bar, type `powershell`, and press Enter.
3. Install the app's pieces:

```powershell
npm install
```

4. Start the small program that remembers the lists. Leave this window open.

```powershell
npm run server
```

The first time, Windows may ask if Node.js can use the network. Click **Allow**. You should see `Pebble is listening`.

5. Open a **second** PowerShell window in the same folder and start the phone app:

```powershell
npx expo start
```

A QR code appears in that window.

The server keeps a database file at `server/data/pebble.db`. Demo people are added the first time the file is empty:

| Who | Email | Password |
| --- | --- | --- |
| Demo | demo@pebble.app | pebble123 |
| Sam | sam@pebble.app | pebble123 |

Sam already shares the picnic list. The Home list's invite code is `HOME7K`.

Before you put the server on the internet, set `SEED_DEMO` to `false` so strangers cannot sign in as Demo. See [Optional settings](#optional-settings).

## Open it on your iPhone with Expo Go (free)

1. Install **Expo Go** from the App Store.
2. Keep `npm run server` and `npx expo start` running on the computer.
3. Phone and computer on the same Wi-Fi.
4. Open the iPhone **Camera** app and point it at the QR code. Tap the banner. If it asks, open **Expo Go**.
5. On the sign-in screen, tap **Look around with the demo**.

You should see Home and Weekend picnic, the pet, the shop, and Settings.

If the phone says it cannot reach the server:

- The server window must still be open.
- Same Wi-Fi, not mobile data.
- On the sign-in screen, tap **Can't connect?** The address should look like `http://192.168.x.x:8787` (your computer's Wi-Fi address, not `localhost`).
- Allow Node.js through the Windows firewall for port **8787**.
- If the Wi-Fi blocks phones from talking to computers, stop the Expo window and run `npx expo start --tunnel` instead. That only helps the app download. The lists still need the server address to be reachable, so a blocked Wi-Fi means you should [put the server on the internet](#put-the-server-on-the-internet).

Android phones can use the same steps with Expo Go from Google Play. The floating pet is not in Expo Go. It needs the [full Android app](#android-floating-pet).

## Lists, sharing, coins

- **New list** makes a list and a color.
- Open a list and type at the bottom to add a task. Tap the circle to finish it. Tap the words to edit or delete.
- **Share** shows a code. The other person taps **I have an invite code** and types it. They can add, edit, finish, and delete tasks. Only the person who made the list can delete the whole list.
- The app keeps a live connection to the server. A change on one phone shows up on the other within a moment. If the connection drops, it tries again, and pulling away and back also reloads.
- The first time a task is finished, that person gets **10 coins**. Unticking does not take the coins back. Ticking it again does not pay again. Deleting the task does not give coins back either.

## Connect an assistant

In the app, open **Settings**, then **Connect an AI assistant**. The screen is written in plain language. Short version:

1. Create a key and copy it. Pebble shows the full key only once. You can revoke it later on that same screen.
2. The assistant calls your server. A server that is only on your computer is invisible to ChatGPT's website. For a cloud assistant, [put the server on the internet](#put-the-server-on-the-internet) first. You can still test from your own computer.

REST base: `http://YOUR-SERVER:8787/v1`  
MCP address: `http://YOUR-SERVER:8787/mcp`

Send this header on every request:

```text
Authorization: Bearer pebble_your_key_here
```

Tools the assistant can use:

- `list_lists` — see your lists
- `list_tasks` — see tasks on a list
- `add_task` — add a task
- `complete_task` — tick or untick a task
- `delete_task` — remove a task

A key cannot spend coins or make new keys.

Claude: add a custom connector, type HTTP, paste the MCP address, and add the Authorization header.

Anything that can call a URL can use REST. Example from PowerShell (replace the key and the address):

```powershell
curl.exe -H "Authorization: Bearer pebble_your_key" http://127.0.0.1:8787/v1/lists
```

Useful REST paths, all with that header:

- `GET /v1/lists`
- `GET /v1/lists/LIST_ID/tasks`
- `POST /v1/lists/LIST_ID/tasks` with `{ "title": "Buy milk" }`
- `POST /v1/tasks/TASK_ID/complete` with `{ "done": true }`
- `DELETE /v1/tasks/TASK_ID`

The MCP endpoint speaks JSON-RPC (`initialize`, `tools/list`, `tools/call`), protocol versions `2024-11-05` and `2025-03-26`.

## Put the server on the internet

The phone app and the assistant both talk to the server. At home, your computer is the server. Away from home, put that same program on a host.

Any host that can run Node.js 22 works. [Render](https://render.com) is a simple one.

1. Push this project to GitHub (or upload it).
2. On Render, make a **Web Service** from the repo.
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add a disk if the host offers one, mounted so `server/data` is kept. Without a disk, a restart can forget the lists. Pointing the server at Supabase avoids that. See below.
7. Set the environment variables in the next section. Use a long random `JWT_SECRET`. Set `SEED_DEMO` to `false` if strangers can open the server.
8. In the phone app, **Settings → Server address**, paste the host's `https://...` address (no slash at the end) and save.

The free plans on many hosts sleep when nobody is using them. The first open of the day can take half a minute. A cheap paid plan stays awake.

Your privacy page will be `https://YOUR-SERVER/privacy`. Stores ask for a privacy URL when you publish.

### Use Supabase as the database (optional)

Supabase has a free plan. It is a hosted database with a dashboard, which is handy if you do not want the lists stored only in a file on the host.

1. Create a project at [https://supabase.com](https://supabase.com).
2. Open **Project Settings → Database** and copy the URI. Use the **session pooler** string if Supabase shows more than one. It starts with `postgres://` or `postgresql://`.
3. On the server host, set `DATABASE_URL` to that string and `DATABASE_SSL` to `true`.
4. Restart the server. It creates the tables itself. You do not need to paste SQL.

The phone app still talks only to the Pebble server, not directly to Supabase. That keeps the database password off the phone.

## Optional settings

You can skip all of these for the demo. To set them on Windows before `npm run server`:

```powershell
$env:JWT_SECRET = "a long random phrase you keep private"
$env:SEED_DEMO = "false"
$env:PORT = "8787"
$env:DATABASE_URL = "postgres://..."
$env:DATABASE_SSL = "true"
```

Or copy `server/.env.example` to `server/.env` and edit it. The server reads that file when it starts. Values already set in PowerShell win.

| Name | What it does |
| --- | --- |
| `PORT` | Defaults to 8787. |
| `JWT_SECRET` | Scrambles sign-in tokens. Change this before the server is public. |
| `DATABASE_PATH` | Where the database file lives. Default `server/data/pebble.db`. |
| `DATABASE_URL` | If set, lists are stored in Postgres (including Supabase) instead of the file. |
| `DATABASE_SSL` | `true` for Supabase. `false` only for a database on your own machine. |
| `SEED_DEMO` | `false` skips the demo people on an empty database. |
| `EXPO_PUBLIC_API_URL` | Optional. Pins the server address baked into the app. The in-app Settings field overrides it. |

## Android floating pet

iOS does not allow an app to draw on top of other apps. Android does, with the permission called **Display over other apps**.

That pet is **not** in Expo Go. It is in the full Android app:

1. Install [Android Studio](https://developer.android.com/studio) on Windows. It is free.
2. Plug in an Android phone with USB debugging on, or start a virtual phone from Android Studio.
3. In the project folder:

```powershell
npx expo run:android
```

The first build takes a while. It installs Pebble as its own app.
4. Open **Settings** in the app and turn on **Let Pebble walk on my screen**.
5. Android opens a system page. Allow Pebble to display over other apps, go back, and turn the switch on again.
6. Pebble walks and sometimes sits. Drag to move. Tap to open the app. Hats and the other things you equipped are drawn on it.
7. Turn the switch off to send Pebble home. You can also tap the "Pebble is nearby" notification.

If a later `npx expo start` says the project wants a development build, the iPhone Expo Go path is still `npx expo start --go`.

## iPhone widgets, and a free Apple ID

Apple does not allow a pet to float over other apps. The full iPhone build instead includes:

- a Home Screen widget (small and medium) showing the pet and today's tasks
- Lock Screen widgets (the rectangular, circular, and inline ones)
- a Live Activity on the Lock Screen and in the Dynamic Island

The source for those is in `targets/widget`. They are wired with Expo so a Mac or a cloud build can compile them. **Expo Go cannot show them.** The app shows a preview and explains this in Settings.

### What a free Apple ID can and cannot do

You can sideload apps with a free Apple ID (the one you use for the App Store). Tools on Windows:

- [Sideloadly](https://sideloadly.io)
- [AltStore](https://altstore.io) (and AltServer on the PC). AltStore can refresh the signature over Wi-Fi if the computer is on.

Limits Apple sets on free accounts:

- The app **stops opening after 7 days**. Sideload it again, or let AltStore refresh it. A paid account lasts a year.
- **3 apps** installed this way at a time (the helper app counts).
- About **10 new app IDs every 7 days**. If you see "maximum App ID limit", wait or use another Apple ID.
- On the iPhone, the first launch may need **Settings → General → VPN & Device Management → Trust**.

**Widgets and the Dynamic Island need an App Group** so the widget can see your pet and your task counts. Apple does not give App Groups to free accounts, and sideload tools often drop app extensions when they re-sign. With a free Apple ID you should expect:

- the main app to work
- the Home Screen widget, Lock Screen widget, and Dynamic Island pet **not** to show your real pet and tasks (they are missing, or stuck on a placeholder)

Those pieces need the **Apple Developer Program, $99 per year**. Building them also needs a Mac, or Expo's cloud build (which itself expects that paid program to sign the app).

### Sideload steps, once you have an IPA file

An IPA is the iPhone app file. Making one on Windows **without** the $99 program usually does not work, because the cloud builders need a paid Apple team to sign iOS apps. Realistic ways to get an IPA:

- Pay for the Apple Developer Program and run a cloud build (see [App Store](#app-store)).
- Ask someone with a Mac to run `npx expo prebuild -p ios` and build in Xcode with your Apple ID.

When you have an `.ipa`:

1. Install Sideloadly on Windows.
2. Plug in the iPhone, unlock it, and tap Trust.
3. Drag the IPA into Sideloadly, type your Apple ID, and start.
4. On the phone, trust the certificate under VPN & Device Management.
5. Every 7 days, do it again, or use AltStore's refresh.

AltStore, short version: install AltServer on Windows, install AltStore onto the phone from it, then open the IPA from AltStore's My Apps tab. Keep the computer awake on the same Wi-Fi if you want the weekly refresh to happen by itself. The 7-day limit and the widget limits above still apply.

## Publish on Google Play

Cost: a **Google Play Console** account is a **one-time $25** fee.

1. Make the account at [https://play.google.com/console](https://play.google.com/console) and pay the fee. Google may ask for identity details.
2. Make a free Expo account at [https://expo.dev](https://expo.dev) if you want the cloud to build the Android file for you (easiest from Windows).
3. Install the tool and sign in:

```powershell
npm install -g eas-cli
eas login
eas build:configure
```

4. Build an Android App Bundle:

```powershell
eas build -p android --profile production
```

5. In Play Console, create the app. You will need:
   - the app name **Pebble**, a short description, and screenshots
   - a privacy policy URL (`https://YOUR-SERVER/privacy`)
   - a content rating questionnaire
   - the `.aab` file from the Expo build
6. Submit for review. The first review often takes a few days.

You can also build the `.aab` from Android Studio after `npx expo prebuild -p android` if you would rather not use Expo's cloud.

## App Store

Cost: the **Apple Developer Program is $99 per year**. Apple also takes a cut of paid apps. Pebble is free, so that cut does not apply, but the $99 does.

You do **not** need a Mac if you use Expo's cloud build. You **do** need the paid program. A free Apple ID is not enough to publish, and it is not enough for the widgets to work properly.

1. Enroll at [https://developer.apple.com/programs](https://developer.apple.com/programs/).
2. `eas login`, then `eas build -p ios --profile production`. Expo will ask you to sign in with the Apple account so it can create the certificates.
3. `eas submit -p ios` sends the build to App Store Connect.
4. In App Store Connect, add the screenshots, description, privacy policy URL, and age rating, then submit for review.

Until you want to pay, use Expo Go. It has accounts, lists, sharing, the pet, the shop, and the assistant keys.

## Tests

From the project folder:

```powershell
npm test
```

That checks sign-up, sharing, coins (including "no farming" by unticking and ticking again), the shop, API keys, the assistant tools, and live updates.

## If something goes wrong

- **Expo Go says the project is incompatible.** Update Expo Go from the App Store. This app is SDK 54. If the store is behind, the project would need to stay on the SDK that Expo Go actually has. As of this version, SDK 54 is the store build.
- **QR code opens a browser and sits there.** Copy the `exp://` address from the PowerShell window into Expo Go's "Enter URL" box.
- **Demo sign-in fails.** The server window must be running. Tap Can't connect and check the address.
- **A friend cannot join.** They need their own account, your invite code, and the same server address in Settings.

## What is left for a later version

- Widgets and the Dynamic Island on a phone with a paid Apple Developer account, tried on a real iPhone. The code is here; it has not been signed with a paid team in this project.
- The floating Android pet tried on a real phone. The code is in `modules/pebble-overlay`. This environment did not run an Android emulator.
- Push notifications when someone else adds a task.
- Password reset by email.
- Photos on tasks.
- More than one pet, and more shop items.
- A calmer way to host the server with one click, and automatic backups.
- Stronger limits so a leaked key cannot be used thousands of times a minute.
