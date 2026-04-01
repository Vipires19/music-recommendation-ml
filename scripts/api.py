from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import chromadb

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = chromadb.Client(
    settings=chromadb.config.Settings(
        persist_directory="./chroma_db"
    )
)

collection = client.get_or_create_collection(name="songs")


def _embeddings_to_json(embeddings):
    if embeddings is None:
        return []
    out = []
    for row in embeddings:
        if hasattr(row, "tolist"):
            out.append(row.tolist())
        else:
            out.append(list(row))
    return out


@app.get("/embeddings")
def get_all_embeddings():
    """Lê todos os vetores persistidos no Chroma (storage), sem query por similaridade."""
    results = collection.get(include=["embeddings", "metadatas"])
    return {
        "ids": results.get("ids") or [],
        "embeddings": _embeddings_to_json(results.get("embeddings")),
        "metadatas": results.get("metadatas") or [],
    }


@app.post("/query")
def query(data: dict):
    vector = data["vector"]
    exclude_ids = set(str(song_id) for song_id in data.get("exclude_ids", []))
    n_results = int(data.get("n_results", 10))
    query_size = max(n_results * 3, 30)

    results = collection.query(
        query_embeddings=[vector],
        n_results=query_size
    )

    ids = results.get("ids", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    filtered_ids = []
    filtered_metadatas = []
    filtered_distances = []

    for song_id, metadata, distance in zip(ids, metadatas, distances):
        if song_id in exclude_ids:
            continue

        song_data = dict(metadata or {})
        song_data["id"] = song_data.get("id", song_id)

        filtered_ids.append(song_id)
        filtered_metadatas.append(song_data)
        filtered_distances.append(distance)

        if len(filtered_ids) >= n_results:
            break

    return {
        "ids": [filtered_ids],
        "metadatas": [filtered_metadatas],
        "distances": [filtered_distances],
    }