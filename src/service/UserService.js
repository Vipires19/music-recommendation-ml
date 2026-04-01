import { loadSongsWithChromaEmbeddings } from './ChromaStorageService.js';

export class UserService {
    #storageKey = 'music-users';
    #songsCache = null;

    async getDefaultUsers() {
        const existing = this.#getStorage();

        if (existing && existing.length > 0) {
            console.log('📦 using users from localStorage:', existing.length);
            return existing;
        }

        const response = await fetch('./data/users.json');
        const users = await response.json();

        console.log('🆕 loading default users:', users.length);

        this.#setStorage(users);
        return users;
    }

    async getUsers() {
        return this.#getStorage();
    }

    async getUserById(userId) {
        const users = this.#getStorage();
        const user = users.find(user => user.id === userId);
        if (!user) return user;

        const enrichedLikes = await this.enrichLikes(user.likes || []);
        const hasChanges = enrichedLikes.some((like, index) => {
            const original = (user.likes || [])[index] || {};
            return original.artist !== like.artist || original.genre !== like.genre;
        });

        if (hasChanges) {
            user.likes = enrichedLikes;
            this.#setStorage(users);
        }

        return user;
    }

    async updateUser(user) {
        const users = this.#getStorage();
        const userIndex = users.findIndex(u => u.id === user.id);

        users[userIndex] = { ...users[userIndex], ...user };
        this.#setStorage(users);

        return users[userIndex];
    }

    async addUser(user) {
        const users = this.#getStorage();
        this.#setStorage([user, ...users]);
    }

    // =========================
    // 🎧 NEW MUSIC LOGIC
    // =========================

    // 👉 Users must have likes
    ensureLikes(user) {
        if (!user.likes) user.likes = [];
        return user;
    }

    // 👉 add liked song
    async likeSong(userId, song) {
        const users = this.#getStorage();
        const user = users.find(u => u.id === userId);

        this.ensureLikes(user);

        const alreadyLiked = user.likes.some(l => l.id === song.id);

        if (!alreadyLiked) {
            user.likes.push({
                id: song.id,
                name: song.name,
                artist: song.artist,
                genre: song.genre
            });
        }

        this.#setStorage(users);
        return user;
    }

    // 👉 get liked songs
    getLikedSongs(user) {
        return user.likes || [];
    }

    // 👉 transform likes in embeddings
    mapLikedSongs(user, allSongs) {
        const likes = user.likes || [];

        return likes
            .map(like => allSongs.find(song => song.id === like.id))
            .filter(Boolean);
    }

    async enrichLikes(likes) {
        if (!likes.length) return likes;
        const songs = await this.#getSongs();
        const songsById = new Map(songs.map(song => [song.id, song]));

        return likes.map(like => {
            const song = songsById.get(like.id);
            return {
                ...like,
                artist: like.artist || song?.artist || '-',
                genre: like.genre || song?.genre || '-',
            };
        });
    }

    // 👉 Create user vector
    createUserVector(likedSongs) {
        if (!likedSongs.length) return [];

        const length = likedSongs[0].embedding.length;
        const sum = new Array(length).fill(0);

        likedSongs.forEach(song => {
            song.embedding.forEach((val, i) => {
                sum[i] += val;
            });
        });

        return sum.map(v => v / likedSongs.length);
    }

    // =========================
    // STORAGE
    // =========================

    #getStorage() {
        const data = localStorage.getItem(this.#storageKey);
        return data ? JSON.parse(data) : [];
    }

    #setStorage(data) {
        localStorage.setItem(this.#storageKey, JSON.stringify(data));
    }

    async #getSongs() {
        if (this.#songsCache) return this.#songsCache;
        const response = await fetch('./data/songs.json');
        let songs = await response.json();
        this.#songsCache = await loadSongsWithChromaEmbeddings(songs);
        return this.#songsCache;
    }
}