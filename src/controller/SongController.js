import { loadSongsWithChromaEmbeddings } from '../service/ChromaStorageService.js'

export class SongController {
    constructor({ songsView, userService, events }) {
        this.songsView = songsView
        this.userService = userService
        this.events = events

        this.songs = []
        this.currentUser = null
    }

    static init(deps) {
        const instance = new SongController(deps)
        instance.init()
        return instance
    }

    async init() {
        await this.loadSongs()
        this.setupUserListener()
        this.setupCallbacks()
    }

    async loadSongs() {
        const response = await fetch('./data/songs.json')
        let songs = await response.json()
        songs = await loadSongsWithChromaEmbeddings(songs)
        this.songs = songs

        // render inicial (sem usuário selecionado → desabilita botões)
        await this.songsView.render(this.songs, true)
    }

    async renderSongsForCurrentUser(baseSongs = this.songs) {
        if (!this.currentUser) {
            await this.songsView.render(baseSongs, true)
            return
        }

        const likedIds = new Set((this.currentUser.likes || []).map(l => l.id))
        const songsToRender = baseSongs.filter(song => !likedIds.has(song.id))
        await this.songsView.render(songsToRender, false)
    }

    setupUserListener() {
        const userSelect = document.getElementById('userSelect')

        userSelect.addEventListener('change', async (e) => {
            const userId = Number(e.target.value)

            if (!userId) {
                this.currentUser = null
                this.songsView.onUserSelected(null)
                return
            }

            this.currentUser = await this.userService.getUserById(userId)

            // habilita botões quando usuário selecionado
            this.songsView.onUserSelected(this.currentUser)
            await this.renderSongsForCurrentUser(this.songs)

            // 🔥 opcional: dispara evento de usuário selecionado
            this.events.dispatchUserSelected(this.currentUser)
        })
    }

    setupCallbacks() {
        this.songsView.registerLikeSongCallback(
            this.handleLike.bind(this)
        )

        this.events.onRecommendationsReady(async (recommendations) => {
            const hasRecommendations = Array.isArray(recommendations) && recommendations.length > 0
            const sourceSongs = hasRecommendations ? recommendations : this.songs
            console.log('[SongController] render source:', hasRecommendations ? 'recommendations' : 'all songs fallback')
            await this.renderSongsForCurrentUser(sourceSongs)
        })
    }

    async handleLike(song) {
        if (!this.currentUser) {
            alert('Selecione um usuário primeiro')
            return
        }

        // salva like
        await this.userService.likeSong(this.currentUser.id, song)

        // pega usuário atualizado do storage
        this.currentUser = await this.userService.getUserById(this.currentUser.id)

        // remove imediatamente da listagem de músicas o que já foi curtido
        await this.renderSongsForCurrentUser(this.songs)

        // 🔥 dispara evento global (ESSENCIAL)
        this.events.dispatchLikeAdded({
            userId: this.currentUser.id,
            song
        })

        // 🔥 opcional: atualizar lista de likes na UI
        this.events.dispatchUsersUpdated({
            users: await this.userService.getUsers()
        })

        console.log('❤️ Like registrado:', song.name)
    }
}