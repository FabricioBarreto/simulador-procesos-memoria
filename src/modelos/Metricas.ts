import { IGestorMemoria } from '../interfaces/IGestorMemoria';
import { DatoInvalidoError } from '../errores/DatoInvalidoError';
import { validarEnteroNoNegativo } from '../utilidades/validarEnteroNoNegativo';

// Métricas del sistema en un instante (RF09).
// Es una "foto": los valores se calculan al construirla y no cambian después,
// aunque la memoria o la CPU sigan avanzando. El simulador crea una nueva al
// final de cada tick. Los porcentajes se devuelven SIN redondear.
export class Metricas {
    readonly #ocupacionMemoria: number;
    readonly #utilizacionCpu: number;
    readonly #cambiosContexto: number;
    readonly #memoriaLibreTotal: number;
    readonly #mayorBloqueLibre: number;
    readonly #fragmentacionExterna: number;

    constructor(memoria: IGestorMemoria, ticksTranscurridos: number, ticksCpuOcupada: number, cambiosContexto: number) {
        validarEnteroNoNegativo('ticks transcurridos', ticksTranscurridos);
        validarEnteroNoNegativo('ticks con CPU ocupada', ticksCpuOcupada);
        validarEnteroNoNegativo('cambios de contexto', cambiosContexto);

        if (ticksCpuOcupada > ticksTranscurridos) {
            throw new DatoInvalidoError(
                'ticks con CPU ocupada', ticksCpuOcupada, `menor o igual a los ticks transcurridos (${ticksTranscurridos})`
            );
        }

        // Ocupación de memoria = 100 × memoria ocupada / memoria total
        this.#ocupacionMemoria = (100 * memoria.memoriaOcupada) / memoria.memoriaTotal;

        // Utilización de CPU = 100 × ticks con CPU ocupada / ticks transcurridos (0% en el tick 0)
        this.#utilizacionCpu = ticksTranscurridos === 0 ? 0 : (100 * ticksCpuOcupada) / ticksTranscurridos;

        this.#cambiosContexto = cambiosContexto;
        this.#memoriaLibreTotal = memoria.memoriaLibreTotal;
        this.#mayorBloqueLibre = memoria.mayorBloqueLibre;

        // Fragmentación externa = 100 × (1 − mayor bloque libre / memoria libre total)
        // Si no hay memoria libre, no hay fragmentación: 0%
        this.#fragmentacionExterna = this.#memoriaLibreTotal === 0
            ? 0
            : 100 * (1 - this.#mayorBloqueLibre / this.#memoriaLibreTotal);
    }

    public get ocupacionMemoria(): number {
        return this.#ocupacionMemoria;
    }

    public get utilizacionCpu(): number {
        return this.#utilizacionCpu;
    }

    public get cambiosContexto(): number {
        return this.#cambiosContexto;
    }

    public get memoriaLibreTotal(): number {
        return this.#memoriaLibreTotal;
    }

    public get mayorBloqueLibre(): number {
        return this.#mayorBloqueLibre;
    }

    public get fragmentacionExterna(): number {
        return this.#fragmentacionExterna;
    }
}
