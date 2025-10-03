# Jama’ah Backend

Node.js + Express backend for **Jama’ah**, a platform that lets Muslims listen to the Qur’an together in realtime, create shared listening rooms, and sync playback with others.
Powered by **Supabase** (auth, Postgres, RLS) and **Socket.IO** for realtime events.

---

## 🚀 Features

* 🔐 **Authentication** (Supabase JWT + middleware)
* 🕌 **Rooms API** – create, join, and list Qur’an listening rooms
* 🎧 **Playback state** – track current surah/ayah, reciter, and sync with participants
* 👥 **Room members** – enforce roles (host, listener)
* 📡 **Realtime** – socket events for playback updates and presence

---

## 📂 Project Structure

```
jamaah-backend/
├── src/
│   ├── index.ts          # Express app entry
│   ├── supabase.js       # Supabase client
│   ├── middleware/
│   │   └── auth.js       # requireAuth / requireHost middlewares
│   ├── routes/
│   │   ├── rooms.js      # Create & list rooms
│   │   ├── playback.js   # Playback sync
│   │   ├── prayer.js     # Prayer times
│   │   ├── quran.js      # Quran timings API proxy
│   │   └── alerts.js     # Notifications / alerts
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

---

## 🛠️ Tech Stack

* **Node.js** + **Express**
* **TypeScript**
* **Supabase** (Postgres, Auth, Row-Level Security)
* **Socket.IO** (realtime sync)
* **Morgan** (logging), **CORS** (API access control)
* Deployed on **Render** / **Railway** / **Vercel serverless**

---

## ⚙️ Setup & Installation

1. Clone repo

   ```bash
   git clone https://github.com/yourname/jamaah-backend.git
   cd jamaah-backend
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create `.env` file:

   ```env
   PORT=8080
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run in development:

   ```bash
   npm run dev
   ```

5. Build & start:

   ```bash
   npm run build
   npm start
   ```

