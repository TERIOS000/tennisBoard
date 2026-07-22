# Tennis Board

Tennis Board is a mobile-friendly weekly schedule for a tennis group. It shows
which courts are reserved for each evening time slot and lets group members
update reservations and attach payment or booking QR images from one shared
board.

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

## Technology

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- Firebase Authentication, Cloud Firestore, Cloud Storage, and App Check
- Vitest for domain tests

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Firebase
configuration, the app runs locally with in-memory sample data. Changes made in
this mode are not shared and disappear when the page is reloaded.

## Firebase Setup

To enable a persistent board shared between users:

1. Create a Firebase web project.
2. Copy `.env.example` to `.env.local` and provide every
   `NEXT_PUBLIC_FIREBASE_*` value.
3. Enable Cloud Firestore, Cloud Storage, and Anonymous Authentication.
4. Register a reCAPTCHA v3 app for App Check and set
   `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`.
5. Install and authenticate the Firebase CLI, select your project, then deploy
   the included security rules:

```bash
firebase deploy --only firestore:rules,storage
```

The app anonymously authenticates browsers before writes. Reads are public;
writes and uploaded images are validated by `firestore.rules` and
`storage.rules`. Anyone with access to a board link can practically edit the
shared schedule, so configure and share deployments accordingly.

## Available Scripts

```bash
npm run dev     # Start the development server
npm run build   # Create a production build
npm run start   # Run the production build
npm run lint    # Run ESLint
npm test        # Run the test suite once
```

## License

Tennis Board is available under the [MIT License](LICENSE). Use of the software
is also subject to the accompanying [disclaimer](DISCLAIMER.md).
