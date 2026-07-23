# CourtRao

CourtRao is a mobile-friendly weekly schedule for a tennis group. It shows
which courts are reserved for each evening time slot and lets group members
update reservations and attach payment or booking QR images from one shared
board.

## About This Project

CourtRao was created for a tennis group that plays at the Thammasat University
tennis courts. It gives members one shared place to check weekly court
reservations, coordinate evening playing times, and keep booking or payment QR
images together. The goal is to make organizing group sessions easier and
reduce confusion about which courts and time slots have already been reserved.

## Features

- Seven-day schedule based on the `Asia/Bangkok` time zone
- Evening slots at 18:00, 19:00, and 20:00 for courts C1-C5
- English and Thai interfaces
- Shared real-time updates through Firebase
- JPEG, PNG, and WebP QR-image uploads up to 5 MB each
- Image gallery and full-size viewer
- Offline detection and visible last-updated information
- Installable Progressive Web App for mobile and desktop
- Keyboard-accessible dialogs and responsive layouts
- Local sample-data mode for development without Firebase
- Browser push summaries at 09:00 and 16:30 Asia/Bangkok, plus a seven-day notification inbox

## Technology

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- Firebase Authentication, Cloud Firestore, Cloud Storage, Cloud Messaging,
  Cloud Functions, and App Check
- Vitest for domain tests

## Project Structure

```text
.
|-- frontend/  # Next.js web application
|-- backend/   # Firebase Cloud Functions
|-- firebase.json
|-- firestore.rules
`-- storage.rules
```

## Getting Started

Install the frontend dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Firebase
configuration, the app runs locally with in-memory sample data. Changes made in
this mode are not shared and disappear when the page is reloaded.

Install the backend dependencies separately:

```bash
cd backend
npm install
```

## Firebase Setup

To enable a persistent board shared between users:

1. Create a Firebase web project.
2. Copy `frontend/.env.example` to `frontend/.env.local` and provide every
   `NEXT_PUBLIC_FIREBASE_*` value.
3. Enable Cloud Firestore, Cloud Storage, and Anonymous Authentication.
4. Register a reCAPTCHA v3 app for App Check and set
   `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`.
5. Install and authenticate the Firebase CLI, select your project, then deploy
   the included security rules:

```bash
firebase deploy --only firestore:rules,storage,functions
```

For notifications, upgrade the project to Blaze, enable Cloud Messaging and the
FCM Registration API, generate a Web Push certificate, and place its public key
in `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. Install the function dependencies with
`npm install --prefix backend` before deploying.

Notification documents and read receipts use an `expiresAt` timestamp. Enable
automatic seven-day cleanup by creating Firestore TTL policies for both
collection groups:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=notifications --enable-ttl
gcloud firestore fields ttls update expiresAt --collection-group=notificationReads --enable-ttl
```

Push requires an HTTPS deployment. On iPhone and iPad, users must install the
PWA on their Home Screen before enabling web push.

The `sendMorningReminder` and `sendAfternoonReminder` functions run in
`asia-southeast1` at 09:00 and 16:30 in the `Asia/Bangkok` time zone. At each
run they read only the current day's
occupied slots and sends one combined court summary to subscribed devices. It
sends nothing when the day has no bookings. Booking additions, updates,
removals, and late bookings do not generate immediate push alerts.

The two summary runs use separate notification IDs, so both are delivered even
when the booking list is unchanged. Notification history and per-device read
state remain available for seven days.

The app anonymously authenticates browsers before writes. Reads are public;
writes and uploaded images are validated by `firestore.rules` and
`storage.rules`. Anyone with access to a board link can practically edit the
shared schedule, so configure and share deployments accordingly.

## Available Scripts

Frontend commands (run from `frontend/`):

```bash
npm run dev     # Start the development server
npm run build   # Create a production build
npm run start   # Run the production build
npm run lint    # Run ESLint
npm test        # Run the test suite once
```

Backend commands (run from `backend/`):

```bash
npm run build   # Compile the Cloud Functions TypeScript
npm test        # Run the backend test suite once
```

Firebase deployment commands are run from the repository root:

```bash
firebase deploy --only firestore:rules,storage,functions
```

## License

CourtRao is available under the [MIT License](LICENSE). Use of the software
is also subject to the accompanying [disclaimer](DISCLAIMER.md).
