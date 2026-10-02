import { validarEnteroPositivo } from '../utilidades/validarEnteroPositivo';

// Evento determinista de Entrada/Salida definido desde los tests (RF08).
// Objeto de valor inmutable: se dispara cuando el proceso lleva
// "despuesDeCpu" ticks de CPU consumidos y lo bloquea "duracion" ticks.
export class EventoES {
    readonly #despuesDeCpu: number;
    readonly #duracion: number;

    constructor(despuesDeCpu: number, duracion: number) {
        validarEnteroPositivo('ticks de CPU antes de la E/S', despuesDeCpu);
        validarEnteroPositivo('duración de la E/S', duracion);

        this.#despuesDeCpu = despuesDeCpu;
        this.#duracion = duracion;
    }

    public get despuesDeCpu(): number {
        return this.#despuesDeCpu;
    }

    public get duracion(): number {
        return this.#duracion;
    }
}
