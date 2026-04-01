
export class TFVisorController {
    #tfVisorView;
    #events;
    constructor({
        tfVisorView,
        events,
    }) {
        this.#tfVisorView = tfVisorView;
        this.#events = events;

        this.init();
    }

    static init(deps) {
        return new TFVisorController(deps);
    }

    async init() {
        this.setupCallbacks();
    }

    setupCallbacks() {
        document.addEventListener('training:complete', (event) => {
            this.#tfVisorView.showTrainingMetrics(event.detail || {});
        });
    }

}