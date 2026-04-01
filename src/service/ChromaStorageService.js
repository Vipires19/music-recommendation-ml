const CHROMA_BASE_URL = 'http://localhost:8000';

let embeddingsMapPromise = null;

/**
 * Busca uma vez o mapa id -> embedding do Chroma (GET /embeddings).
 * Não usa query por similaridade — só leitura do storage.
 */
async function getEmbeddingsMapFromChroma() {
    if (embeddingsMapPromise) {
        return embeddingsMapPromise;
    }

    embeddingsMapPromise = (async () => {
        try {
            const response = await fetch(`${CHROMA_BASE_URL}/embeddings`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const map = new Map();
            const ids = data.ids || [];
            const embeddings = data.embeddings || [];
            ids.forEach((rawId, index) => {
                const id = Number(rawId);
                const emb = embeddings[index];
                if (Array.isArray(emb) && emb.length) {
                    map.set(id, emb);
                }
            });
            return map;
        } catch (err) {
            console.warn('[ChromaStorage] fallback to JSON embeddings:', err.message || err);
            return new Map();
        }
    })();

    return embeddingsMapPromise;
}

/**
 * Sobrescreve `embedding` com os vetores persistidos no Chroma quando existirem.
 */
export async function loadSongsWithChromaEmbeddings(songs) {
    if (!Array.isArray(songs) || !songs.length) {
        return songs;
    }

    const map = await getEmbeddingsMapFromChroma();
    if (!map.size) {
        return songs;
    }

    return songs.map((song) => {
        const emb = map.get(song.id);
        if (emb) {
            return { ...song, embedding: emb };
        }
        return song;
    });
}
