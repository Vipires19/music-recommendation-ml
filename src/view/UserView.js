import { View } from './View.js';

export class UserView extends View {
    #userSelect = document.querySelector('#userSelect');
    #userAge = document.querySelector('#userAge');
    #likedSongsList = document.querySelector('#likedSongsList');

    #songTemplate;
    #onUserSelect;
    #onSongRemove;
    #likedSongsElements = [];

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#songTemplate = await this.loadTemplate('./src/view/templates/liked-song.html');
        this.attachUserSelectListener();
    }

    registerUserSelectCallback(callback) {
        this.#onUserSelect = callback;
    }

    registerSongRemoveCallback(callback) {
        this.#onSongRemove = callback;
    }

    renderUserOptions(users) {
        const options = users.map(user => {
            return `<option value="${user.id}">${user.name}</option>`;
        }).join('');

        this.#userSelect.innerHTML += options;
    }

    renderUserDetails(user) {
        this.#userAge.value = user.age;
    }

    renderLikedSongs(likedSongs) {
        if (!this.#songTemplate) return;

        if (!likedSongs || likedSongs.length === 0) {
            this.#likedSongsList.innerHTML = '<p>No liked songs yet.</p>';
            return;
        }

        const html = likedSongs.map(song => {
            return this.replaceTemplate(this.#songTemplate, {
                ...song,
                artist: song.artist || '-',
                genre: song.genre || '-',
                song: JSON.stringify(song)
            });
        }).join('');

        this.#likedSongsList.innerHTML = html;
        this.attachSongClickHandlers();
    }

    addLikedSong(song) {

        if (this.#likedSongsList.innerHTML.includes('No liked songs yet')) {
            this.#likedSongsList.innerHTML = '';
        }

        const songHtml = this.replaceTemplate(this.#songTemplate, {
            ...song,
            artist: song.artist || '-',
            genre: song.genre || '-',
            song: JSON.stringify(song)
        });

        this.#likedSongsList.insertAdjacentHTML('afterbegin', songHtml);

        const newPurchase = this.#likedSongsList.firstElementChild.querySelector('.liked-song');
        newPurchase.classList.add('liked-song-highlight');

        setTimeout(() => {
            newPurchase.classList.remove('liked-song-highlight');
        }, 1000);

        this.attachSongClickHandlers();
    }

    attachUserSelectListener() {
        this.#userSelect.addEventListener('change', (event) => {
            const userId = event.target.value ? Number(event.target.value) : null;

            if (userId) {
                if (this.#onUserSelect) {
                    this.#onUserSelect(userId);
                }
            } else {
                this.#userAge.value = '';
                this.#likedSongsList.innerHTML = '';
            }
        });
    }

    attachSongClickHandlers() {
        this.#likedSongsElements = [];

        const songElements = document.querySelectorAll('.liked-song');

        songElements.forEach(songElement => {
                this.#likedSongsElements.push(songElement);

            songElement.onclick = (event) => {

                const song = JSON.parse(songElement.dataset.song);
                const userId = this.getSelectedUserId();
                const element = songElement.closest('.col-md-6');

                if (this.#onSongRemove) {
                    this.#onSongRemove({ element, userId, song });
                }

                element.style.transition = 'opacity 0.5s ease';
                element.style.opacity = '0';

                setTimeout(() => {
                    element.remove();

                    if (document.querySelectorAll('.liked-song').length === 0) {
                        this.renderLikedSongs([]);
                    }

                }, 500);

            }
        });
    }

    getSelectedUserId() {
        return this.#userSelect.value ? Number(this.#userSelect.value) : null;
    }
}
