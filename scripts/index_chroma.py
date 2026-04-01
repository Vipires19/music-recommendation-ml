import chromadb
from chromadb.config import Settings
import json

# cliente persistente REAL
client = chromadb.Client(
    Settings(
        persist_directory="./chroma_db",
        is_persistent=True
    )
)

# cria coleção
collection = client.get_or_create_collection(name="songs")

# limpa coleção antes (evita duplicar)
client.delete_collection(name="songs")
collection = client.get_or_create_collection(name="songs")

# carrega songs.json
with open("data/songs.json", "r", encoding="utf-8") as f:
    songs = json.load(f)

ids = []
embeddings = []
metadatas = []

for song in songs:
    ids.append(str(song["id"]))
    embeddings.append(song["embedding"])

    metadatas.append({
        "id": str(song["id"]),
        "name": song["name"],
        "artist": song["artist"],
        "genre": song["genre"]
    })

# insere no banco
collection.add(
    ids=ids,
    embeddings=embeddings,
    metadatas=metadatas
)

print("✅ Songs indexadas no Chroma!")