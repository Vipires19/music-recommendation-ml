import { View } from './View.js';

export class TFVisorView extends View {
    #logs = [];
    #lossPoints = [];
    #accPoints = [];
    #isVisOpen = false;
    constructor() {
        super();
    }

    resetDashboard() {
        this.#logs = [];
        this.#lossPoints = [];
        this.#accPoints = [];
    }

    handleTrainingLog(log) {
        if (!this.#isVisOpen) {
            tfvis.visor().open();
            this.#isVisOpen = true;
        }

        const { epoch, loss, accuracy } = log;
        this.#lossPoints.push({ x: epoch, y: loss });
        this.#accPoints.push({ x: epoch, y: accuracy });
        this.#logs.push(log);

        tfvis.render.linechart(
            {
                name: 'Precisão do Modelo',
                tab: 'Treinamento',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#accPoints, series: ['precisão'] },
            {
                xLabel: 'Época (Ciclos de Treinamento)',
                yLabel: 'Precisão (%)',
                height: 300
            }
        );

        tfvis.render.linechart(
            {
                name: 'Erro de Treinamento',
                tab: 'Treinamento',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#lossPoints, series: ['erros'] },
            {
                xLabel: 'Época (Ciclos de Treinamento)',
                yLabel: 'Valor do Erro',
                height: 300
            }
        );

    }

    showTrainingMetrics(metrics) {
        const loss = metrics?.loss || [];
        const accuracy = metrics?.accuracy || [];
        const epochs = Math.max(loss.length, accuracy.length);
        if (!epochs) return;

        if (!this.#isVisOpen) {
            tfvis.visor().open();
            this.#isVisOpen = true;
        }

        const values = Array.from({ length: epochs }, (_, epoch) => ({
            epoch,
            loss: Number(loss[epoch] ?? NaN),
            accuracy: Number(accuracy[epoch] ?? NaN),
        }));

        tfvis.show.history(
            { name: 'Loss', tab: 'Treinamento' },
            values,
            ['loss'],
            { xLabel: 'Época', yLabel: 'Loss', height: 240 }
        );

        tfvis.show.history(
            { name: 'Accuracy', tab: 'Treinamento' },
            values,
            ['accuracy'],
            { xLabel: 'Época', yLabel: 'Accuracy', height: 240 }
        );
    }

}
