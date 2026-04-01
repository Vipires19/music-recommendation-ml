# Music Recommendation System (ML + Vector DB)

## Overview

This project demonstrates an end-to-end **music recommendation** flow in the browser, inspired by classic ML coursework, but applied to a **realistic music dataset**. It combines:

- **TensorFlow.js** for training and inference entirely in the browser (no server-side model training).
- **Dense vector embeddings** per song (audio-related features encoded as vectors).
- **ChromaDB** (Python) as a **persistent vector store** served over HTTP so the frontend can load embeddings for songs.

The ranking model is **global**: one neural network is trained on all users’ likes together, then scores every song for the current user.

---

## How It Works

1. **Users and likes** — Each user profile stores liked songs. Likes drive both the user vector and the training labels.
2. **User vectors** — For a user, the system averages embeddings of liked songs (or a zero vector if there are no likes), matching the training setup in `RankingTrainer.js`.
3. **Global training** — A single model is fitted on pairs `(user features, song embedding)` with binary labels (liked vs not), using all users in the dataset.
4. **Prediction** — For the selected user, the app builds one feature row per song (`[userVector, song.embedding]`), runs the trained model, and obtains a score in `[0, 1]`.
5. **Recommendations** — Songs are sorted by score (excluding already liked items). The top results are shown in the UI and used to refresh the song grid.

ChromaDB is used to **store and retrieve embeddings** via the FastAPI backend; **final ranking** is done by the TensorFlow.js model, not by Chroma similarity search alone.

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| UI & logic   | JavaScript (ES modules), HTML, CSS  |
| ML           | TensorFlow.js (CDN in `index.html`) |
| Visualization | TensorFlow.js Visor (`tfjs-vis`) |
| Vector DB    | ChromaDB (Python)                   |
| API          | FastAPI + Uvicorn                   |

---

## Features

- Train a **global** ranking model in the browser.
- **Real-time** recommendations after training (and optional background retrain on new likes).
- **User-based** personalization via averaged liked-song embeddings.
- **Vector-backed** song representation (embeddings from Chroma + catalog).
- **Training curves** (loss / accuracy) via tfjs-vis.

---

## How to Run

### Prerequisites

- **Node.js** (for the static dev server and optional CSV → JSON conversion).
- **Python 3.10+** (for Chroma + FastAPI).

All commands below assume your current directory is the **project root** (where `package.json` and `index.html` live).

### Frontend

```bash
npm install
npm start
```

Then open the URL printed by BrowserSync (usually `http://localhost:3000`).

### Backend (Chroma + embeddings API)

**macOS / Linux**

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell)**

```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Populate Chroma** (reads `data/songs.json`, writes under `./chroma_db`):

```bash
python scripts/index_chroma.py
```

**Start the API** (serves `GET /embeddings` for the frontend):

```bash
uvicorn scripts.api:app --reload --host 127.0.0.1 --port 8000
```

Keep this terminal running while you use the app. The frontend expects the API at `http://localhost:8000` (see `ChromaStorageService.js`).

### Optional: regenerate `songs.json` from CSV

The repo includes `scripts/convert.js`, which builds `data/songs.json` from `data/high_popularity_spotify_data.csv`:

```bash
npm run convert:csv
```

Re-run `python scripts/index_chroma.py` afterward so Chroma stays in sync.

---

## How to Use

1. **Select a user** in the profile panel.
2. **Like** some songs from the catalog.
3. Click **Train Model** — wait for training to finish; the Visor can show loss and accuracy.
4. Click **Run Recommendation** — view ranked suggestions (top list + updated song grid).

---

## Future Improvements

- **Hybrid** retrieval: combine Chroma similarity with the learned ranking head.
- Richer **feature engineering** (e.g., more audio/metadata fields, normalization).
- **Cloud deployment** (static hosting + managed API / DB).
- **Authentication** and per-user model persistence on the server.

---

## Notes

- The **model trains in the browser**; training time depends on dataset size and device.
- **ChromaDB** holds vectors for songs; the app uses it as **storage**, not as the sole ranking mechanism.
- Commit **without** `node_modules/`, `venv/`, or `chroma_db/` — they are listed in `.gitignore`.

---

## Author

Vinícius Pires
