import { View } from './View.js';

export class ModelView extends View {
    #trainModelBtn = document.querySelector('#trainModelBtn');
    #likesArrow = document.querySelector('#likesArrow');
    #likesDiv = document.querySelector('#likesDiv');
    #allUsersLikesList = document.querySelector('#allUsersLikesList');
    #runRecommendationBtn = document.querySelector('#runRecommendationBtn');
    #onTrainModel;
    #onRunRecommendation;

    constructor() {
        super();
        this.attachEventListeners();
    }

    registerTrainModelCallback(callback) {
        this.#onTrainModel = callback;
        console.log('Train callback registered');
    }
    registerRunRecommendationCallback(callback) {
        this.#onRunRecommendation = callback;
        console.log('Run recommendation callback registered');
    }

    attachEventListeners() {
        this.#trainModelBtn.addEventListener('click', () => {
            console.log('🔥 Train button clicked');
            if (!this.#onTrainModel) {
                console.warn('Train callback not registered yet');
                return;
            }
            this.#onTrainModel();
        });
        this.#runRecommendationBtn.addEventListener('click', () => {
            console.log('🔥 Run Recommendation button clicked');
            if (!this.#onRunRecommendation) {
                console.warn('Run recommendation callback not registered yet');
                return;
            }
            this.#onRunRecommendation();
        });

        this.#likesDiv.addEventListener('click', () => {
            const purchasesList = this.#allUsersLikesList;

            const isHidden = window.getComputedStyle(purchasesList).display === 'none';

            if (isHidden) {
                purchasesList.style.display = 'block';
                this.#likesArrow.classList.remove('bi-chevron-down');
                this.#likesArrow.classList.add('bi-chevron-up');
            } else {
                purchasesList.style.display = 'none';
                this.#likesArrow.classList.remove('bi-chevron-up');
                this.#likesArrow.classList.add('bi-chevron-down');
            }
        });

    }
    enableRecommendButton() {
        this.#runRecommendationBtn.disabled = false;
    }
    updateTrainingProgress(progress) {
        this.#trainModelBtn.disabled = true;
        this.#trainModelBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Training...';

        if (progress.progress === 100) {
            this.#trainModelBtn.disabled = false;
            this.#trainModelBtn.innerHTML = '<i class="bi bi-cpu"></i> Train Model';
        }
    }

    renderRecommendations(recommendations) {
        const container = document.getElementById('recommendationsList');
        if (!container) return;

        if (!recommendations?.length) {
            container.innerHTML = '<p class="text-muted small mb-0">Nenhuma recomendação (treine o modelo e clique em Run Recommendation).</p>';
            return;
        }

        const html = recommendations.map((song) => {
            const score = Number(song.rankingScore ?? song.score ?? 0).toFixed(4);
            return `
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body py-2">
                        <h6 class="mb-1">${song.name}</h6>
                        <p class="mb-1 small text-muted">${song.artist}</p>
                        <span class="badge bg-secondary">score ${score}</span>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        container.innerHTML = html;
    }

    renderAllUsersLikedSongs(users) {
        const html = users.map(user => {
            const likedSongsHtml = (user.likes || []).map(likedSong => {
                return `<span class="badge bg-light text-dark me-1 mb-1">${likedSong.name}</span>`;
            }).join('');

            return `
                <div class="user-like-summary">
                    <h6>${user.name} (Age: ${user.age})</h6>
                    <div class="liked-songs-badges">
                        ${likedSongsHtml || '<span class="text-muted">No likes</span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.#allUsersLikesList.innerHTML = html;
    }
}
