import { events } from "./constants.js";

export default class Events {

    // =========================
    // USER
    // =========================

    static onUserSelected(callback) {
        document.addEventListener(events.userSelected, (event) => {
            return callback(event.detail);
        });
    }

    static dispatchUserSelected(data) {
        document.dispatchEvent(new CustomEvent(events.userSelected, {
            detail: data
        }));
    }

    static onUsersUpdated(callback) {
        document.addEventListener(events.usersUpdated, (event) => {
            return callback(event.detail);
        });
    }

    static dispatchUsersUpdated(data) {
        document.dispatchEvent(new CustomEvent(events.usersUpdated, {
            detail: data
        }));
    }

    // =========================
    // LIKES 🔥
    // =========================

    static onLikeAdded(callback) {
        document.addEventListener(events.likeAdded, (event) => {
            return callback(event.detail);
        });
    }

    static dispatchLikeAdded(data) {
        document.dispatchEvent(new CustomEvent(events.likeAdded, {
            detail: data
        }));
    }

    // =========================
    // RECOMMENDATION
    // =========================

    static onRecommend(callback) {
        document.addEventListener(events.recommend, (event) => {
            return callback(event.detail);
        });
    }

    static dispatchRecommend(data) {
        document.dispatchEvent(new CustomEvent(events.recommend, {
            detail: data
        }));
    }

    static onRecommendationsReady(callback) {
        document.addEventListener(events.recommendationsReady, (event) => {
            return callback(event.detail);
        });
    }

    static dispatchRecommendationsReady(data) {
        document.dispatchEvent(new CustomEvent(events.recommendationsReady, {
            detail: data
        }));
    }
}