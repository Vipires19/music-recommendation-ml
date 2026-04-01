function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildUserVectorFromLikes(likedSongs, embeddingDim) {
    if (!likedSongs.length) {
        return new Array(embeddingDim).fill(0);
    }
    const sum = new Array(embeddingDim).fill(0);
    likedSongs.forEach((song) => {
        (song.embedding || []).forEach((value, index) => {
            sum[index] += value;
        });
    });
    return sum.map((v) => v / likedSongs.length);
}

/**
 * Treina UM modelo global: todos os usuários, todos os pares (usuário, música).
 * Feature: [userVector, song.embedding] — label 1 se curtida, 0 caso contrário.
 */
export async function trainGlobalModel(users, songs) {
    if (!globalThis.tf) {
        throw new Error('TensorFlow.js (tf) is not available in global scope.');
    }

    const userList = Array.isArray(users) ? users : [users];
    if (!userList.length || !songs?.length) {
        throw new Error('trainGlobalModel requires users and songs.');
    }

    const embeddingDim = songs[0].embedding.length;
    const songsById = new Map(songs.map((s) => [s.id, s]));

    const X = [];
    const y = [];

    for (const user of userList) {
        const likedIds = new Set((user.likes || []).map((like) => like.id));
        const likedSongs = [...likedIds]
            .map((id) => songsById.get(id))
            .filter(Boolean);
        const userVector = buildUserVectorFromLikes(likedSongs, embeddingDim);

        const negativeSamples = shuffle(songs).slice(0, 20);

        const trainingSongs = [
            ...likedSongs,
            ...negativeSamples,
        ];

        for (const song of trainingSongs) {
            if (!Array.isArray(song.embedding) || song.embedding.length !== embeddingDim) {
                continue;
            }
            X.push([...userVector, ...song.embedding]);
            y.push(likedIds.has(song.id) ? 1 : 0);
        }
    }

    if (!X.length) {
        throw new Error('No training samples generated.');
    }

    const order = shuffle(X.map((_, index) => index));
    const XShuffled = order.map((i) => X[i]);
    const yShuffled = order.map((i) => y[i]);

    const featureSize = XShuffled[0].length;
    const xs = tf.tensor2d(XShuffled, [XShuffled.length, featureSize]);
    const ys = tf.tensor2d(yShuffled, [yShuffled.length, 1]);

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [featureSize], units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });

    const history = await model.fit(xs, ys, {
        epochs: 5,
        batchSize: Math.min(32, XShuffled.length),
        shuffle: true,
        verbose: 0,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log(`Epoch ${epoch}`, logs);
            },
        },
    });

    xs.dispose();
    ys.dispose();

    const loss = history?.history?.loss || [];
    const accuracy = history?.history?.accuracy || history?.history?.acc || [];

    return {
        model,
        loss,
        accuracy,
        metrics: { loss, accuracy },
    };
}

/**
 * @param {Array|object} users - Array com todos os usuários (preferido), ou um único objeto usuário.
 * @param {Array} songs - Catálogo completo de músicas.
 */
export async function trainModel(users, songs) {
    return trainGlobalModel(users, songs);
}
