import { View } from './View.js';

export class SongsView extends View {
    #songList = document.querySelector('#songList');

    #buttons;
    #songTemplate;
    #initPromise;
    #onLikeSong;

    constructor() {
        super();
        this.#initPromise = this.init();
    }

    async init() {
        this.#songTemplate = await this.loadTemplate('./src/view/templates/song-card.html');
    }

    onUserSelected(user) {
        this.setButtonsState(!user?.id);
    }

    registerLikeSongCallback(callback) {
        this.#onLikeSong = callback;
    }

    async render(songs, disableButtons = true) {
        if (!this.#songTemplate) {
            await this.#initPromise;
            if (!this.#songTemplate) return;
        }

        const html = songs.map(song => {
            return this.replaceTemplate(this.#songTemplate, {
                id: song.id,
                name: song.name,
                artist: song.artist,
                genre: song.genre,
                song: JSON.stringify(song)
            });
        }).join('');

        this.#songList.innerHTML = html;
        this.attachLikeButtonListeners();

        this.setButtonsState(disableButtons);
    }

    setButtonsState(disabled) {
        if (!this.#buttons) {
            this.#buttons = document.querySelectorAll('.like-btn');
        }
        this.#buttons.forEach(button => {
            button.disabled = disabled;
        });
    }

    attachLikeButtonListeners() {
        this.#buttons = document.querySelectorAll('.like-btn');

        this.#buttons.forEach(button => {
            button.addEventListener('click', () => {
                const song = JSON.parse(button.dataset.song);

                const originalText = button.innerHTML;

                button.innerHTML = '❤️ Liked';
                button.classList.add('liked');

                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('liked');
                }, 500);

                if (this.#onLikeSong) {
                    this.#onLikeSong(song, button);
                }
            });
        });
    }
}