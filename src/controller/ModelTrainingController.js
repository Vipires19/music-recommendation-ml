import { trainModel } from '../service/RankingTrainer.js'
import { loadSongsWithChromaEmbeddings } from '../service/ChromaStorageService.js'

const GLOBAL_RANKING_KEY = '__global__';
const RECOMMENDATION_TOP_N = 10;

export class ModelController {
    #modelView;
    #userService;
    #events;

    #currentUser = null;
    #songs = [];
    #rankingModels = new Map();
    #trainingByUser = new Map();
    /** IDs de usuários com modelo treinado (ranking TF). */
    #modelTrained = new Set();

    constructor({
        modelView,
        userService,
        events,
    }) {
        this.#modelView = modelView;
        this.#userService = userService;
        this.#events = events;

        this.init();
    }

    static init(deps) {
        return new ModelController(deps);
    }

    async init() {
        await this.loadSongs();
        this.setupCallbacks();
    }

    async loadSongs() {
        const response = await fetch('./data/songs.json');
        let songs = await response.json();
        this.#songs = await loadSongsWithChromaEmbeddings(songs);
    }

    setupCallbacks() {
        this.#modelView.registerTrainModelCallback(
            this.handleTrainModel.bind(this)
        );

        // botão "Run Recommendation"
        this.#modelView.registerRunRecommendationCallback(
            this.handleRunRecommendation.bind(this)
        );

        // quando seleciona usuário
        this.#events.onUserSelected((user) => {
            this.#currentUser = user;
        });

        // 🔥 NOVO: atualiza automaticamente quando der like
        this.#events.onLikeAdded(async () => {
            if (this.#currentUser?.id) {
                const refreshedUser = await this.#userService.getUserById(this.#currentUser.id);
                this.retrainModelInBackground(refreshedUser);
            }
            await this.handleRunRecommendation();
        });
    }

    async handleTrainModel() {
        console.log('🚀 handleTrainModel called');
        console.log('currentUser:', this.#currentUser);

        if (!this.#currentUser?.id) {
            console.warn('❌ No user selected');
            alert('Selecione um usuário primeiro');
            return;
        }

        try {
            const allUsers = await this.#userService.getUsers();
            console.log('📦 users loaded:', allUsers.length);

            console.log('🧠 starting training...');

            const trained = await trainModel(allUsers, this.#songs);
            console.log('✅ training finished:', trained);

            const tfvis = window.tfvis;
            if (tfvis?.visor) {
                tfvis.visor().open();
            }
            if (tfvis?.show?.history) {
                const loss = trained.loss || trained.metrics?.loss || [];
                const acc = trained.accuracy || trained.metrics?.accuracy || [];
                const epochs = Math.max(loss.length, acc.length);
                if (epochs > 0) {
                    const rowData = Array.from({ length: epochs }, (_, i) => ({
                        epoch: i,
                        loss: loss[i],
                        accuracy: acc[i],
                    }));
                    await tfvis.show.history(
                        { name: 'Training Performance', tab: 'Treinamento' },
                        rowData,
                        ['loss', 'accuracy']
                    );
                }
            }

            const previous = this.#rankingModels.get(GLOBAL_RANKING_KEY);
            if (previous?.model) {
                previous.model.dispose();
            }
            this.#rankingModels.set(GLOBAL_RANKING_KEY, trained);
            console.log('💾 model saved in controller');

            this.#modelView.enableRecommendButton();

            allUsers.forEach((u) => this.#modelTrained.add(u.id));

            console.log('✅ Model trained (global)!');

            document.dispatchEvent(new CustomEvent('training:complete', {
                detail: {
                    loss: trained.loss || trained.metrics?.loss || [],
                    accuracy: trained.accuracy || trained.metrics?.accuracy || [],
                }
            }));
        } catch (error) {
            console.error('🔥 TRAIN ERROR:', error);
        }
    }

    retrainModelInBackground(user) {
        if (!user?.id) return;
        if (this.#trainingByUser.has(GLOBAL_RANKING_KEY)) return;

        const trainingPromise = (async () => {
            const allUsers = await this.#userService.getUsers();
            const trained = await trainModel(allUsers, this.#songs);
            const previous = this.#rankingModels.get(GLOBAL_RANKING_KEY);
            if (previous?.model) {
                previous.model.dispose();
            }
            this.#rankingModels.set(GLOBAL_RANKING_KEY, trained);
            allUsers.forEach((u) => this.#modelTrained.add(u.id));
            console.log('[Ranking] global model retrained');
        })()
            .catch((error) => {
                console.error('[Ranking] retrain failed:', error);
            })
            .finally(() => {
                this.#trainingByUser.delete(GLOBAL_RANKING_KEY);
            });

        this.#trainingByUser.set(GLOBAL_RANKING_KEY, trainingPromise);
    }

    async handleRunRecommendation() {
        console.log('📡 run recommendation triggered');

        if (!this.#currentUser) {
            alert('Selecione um usuário primeiro');
            return;
        }

        const user = await this.#userService.getUserById(this.#currentUser.id);
        console.group('[Recommendation Pipeline]');
        console.log('userId:', user.id);

        const rankingState = this.#rankingModels.get(GLOBAL_RANKING_KEY);
        const model = rankingState?.model;

        if (!rankingState || !model) {
            alert('Treine o modelo (Train Model) antes de rodar recomendações.');
            console.log('modelo global ausente — recomendação bloqueada');
            console.groupEnd();
            return;
        }

        const likedSongs = this.#userService.mapLikedSongs(user, this.#songs);
        console.log('likedSongs:', likedSongs.length);

        const embeddingDim = this.#songs[0]?.embedding?.length;
        if (!embeddingDim) {
            console.error('Catálogo sem embeddings válidos.');
            console.groupEnd();
            return;
        }

        const likedIds = new Set((user.likes || []).map((l) => l.id));
        const userVector = likedSongs.length
            ? this.#userService.createUserVector(likedSongs)
            : new Array(embeddingDim).fill(0);
        console.log('userVector size:', userVector.length);

        try {
            const features = [];
            const songRefs = [];
            for (const song of this.#songs) {
                if (!Array.isArray(song.embedding) || song.embedding.length !== embeddingDim) {
                    continue;
                }
                features.push([...userVector, ...song.embedding]);
                songRefs.push(song);
            }

            if (!features.length) {
                console.warn('Nenhuma feature gerada.');
                console.groupEnd();
                return;
            }

            const xs = tf.tensor2d(features);
            const predictions = model.predict(xs);
            const scores = await predictions.data();

            xs.dispose();
            predictions.dispose();

            const ranked = songRefs
                .map((song, index) => ({
                    ...song,
                    rankingScore: scores[index] ?? 0,
                }))
                .filter((song) => !likedIds.has(song.id))
                .sort((a, b) => b.rankingScore - a.rankingScore);

            const topSongs = ranked.slice(0, RECOMMENDATION_TOP_N);

            this.#modelView.renderRecommendations(topSongs);
            this.#events.dispatchRecommendationsReady(topSongs);

            console.log('mode: tensorflow predict (all songs, trained global model)');
            console.log('songs scored:', features.length);
            console.log('top N:', topSongs.length);
            console.table(topSongs.map((song) => ({
                id: song.id,
                name: song.name,
                genre: song.genre,
                rankingScore: Number(song.rankingScore || 0).toFixed(4),
            })));

            const top1 = topSongs[0];
            const top2 = topSongs[1];
            if (top1) {
                const deltaToSecond = top2
                    ? ((top1.rankingScore || 0) - (top2.rankingScore || 0))
                    : (top1.rankingScore || 0);
                console.group('[Why this song is #1]');
                console.log(`Top 1: ${top1.name} (${top1.genre})`);
                console.log('rankingScore:', Number(top1.rankingScore || 0).toFixed(4));
                console.log('delta vs #2:', Number(deltaToSecond || 0).toFixed(4));
                console.groupEnd();
            }
            console.groupEnd();
        } catch (error) {
            console.error('Erro ao buscar recomendações:', error);
            this.#modelView.renderRecommendations([]);
            this.#events.dispatchRecommendationsReady([]);
            console.groupEnd();
        }
    }
} 