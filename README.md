# Firebase Chat

A real-time chat app built with Firebase (Authentication + Firestore + Realtime Database + Hosting)

<img src="https://i.imgur.com/ZXKgJMY.jpeg" width="80%"/>

## 📦 Tech Stack
**Frontend:** SvelteKit + TypeScript + Tailwind CSS + Vite  
**Backend:** Firebase Authentication, Firestore, Realtime Database, Cloud Functions  
**Deployment:** Firebase Hosting

## 🚀 Features

- **Phone Authentication** - Sign in with phone number and SMS verification
- **User Onboarding** - Set username and display name
- **Real-time Messaging** - Instant messaging with Firestore
- **User Search** - Find users by username to start conversations
- **Presence Tracking** - See when users are online/offline and last seen
- **Message Chunking** - Efficient handling of large chat histories
- **Responsive Design** - Works on desktop and mobile devices
- **Secure Backend** - Cloud Functions handle server-side logic

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or later)
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Authentication, Firestore, and Realtime Database enabled

### Firebase Configuration
Connect to your Firebase project:
   ```bash
   firebase login
   firebase use --add
   ```

### Frontend Setup
1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `web` folder:
   ```env
   PUBLIC_FIREBASE_CONFIG='{
     "apiKey": "<YOUR_API_KEY>",
     "authDomain": "<YOUR_AUTH_DOMAIN>",
     "projectId": "<YOUR_PROJECT_ID>",
     "storageBucket": "<YOUR_STORAGE_BUCKET>",
     "messagingSenderId": "<YOUR_MESSAGING_SENDER_ID>",
     "appId": "<YOUR_APP_ID>",
     "measurementId": "<YOUR_MEASUREMENT_ID>"
   }'
   PUBLIC_RTDB_URL="<YOUR_REALTIME_DATABASE_URL>"
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Firebase Functions Setup
1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Firebase emulator:
   ```bash
   npm run serve
   ```

## 🏗️ Project Structure

```
├── web/                    # SvelteKit frontend
│   ├── src/
│   │   ├── routes/         # App routes
│   │   ├── lib/            # Shared components and utilities
│   │   └── app.html        # Main HTML template
│   └── static/             # Static assets
├── functions/              # Firebase Cloud Functions
│   └── src/
│       └── index.ts        # Function definitions
├── firestore.rules         # Firestore security rules
├── database.rules.json     # Realtime Database rules
└── firebase.json           # Firebase configuration
```

## 📦 Deployment

1. Build the web application:
   ```bash
   cd web && npm run build
   ```

2. Deploy to Firebase by running below command at root directory:
   ```bash
   firebase deploy
   ```

## 🔧 Key Technologies

- **SvelteKit**: Full-stack web framework with file-based routing
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **Firebase Auth**: Phone number authentication with reCAPTCHA
- **Firestore**: NoSQL document database for messages and user data
- **Realtime Database**: Real-time presence tracking
- **Cloud Functions**: Serverless backend logic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 Security

- All sensitive operations are handled by Cloud Functions
- Firestore security rules prevent unauthorized access
- Phone authentication provides secure user verification
- Message chunking prevents database document size limits