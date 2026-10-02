import { OperacionMemoriaInvalidaError } from '../errores/OperacionMemoriaInvalidaError';
import { validarEnteroPositivo } from '../utilidades/validarEnteroPositivo';
import { validarEnteroNoNegativo } from '../utilidades/validarEnteroNoNegativo';

// Resultado de asignar un bloque: la parte ocupada y, si sobró espacio,
// un bloque libre con el resto
export interface DivisionBloque {
    readonly ocupado: BloqueMemoria;
    readonly restante: BloqueMemoria | null;
}

// Un tramo contiguo de memoria (RF04): inicio, tamaño y proceso asignado o libre.
// Es INMUTABLE: asignar, liberar o fusionar no modifican el bloque, devuelven
// bloques nuevos. Así el gestor puede exponerlos sin riesgo de que alguien
// los altere desde afuera (RF10) y se evita romper el mapa de memoria.
export class BloqueMemoria {
    readonly #inicio: number;
    readonly #tamanio: number;
    readonly #pid: number | null;

    constructor(inicio: number, tamanio: number, pid: number | null = null) {
        validarEnteroNoNegativo('inicio del bloque', inicio);
        validarEnteroPositivo('tamaño del bloque', tamanio);

        if (pid !== null) {
            validarEnteroPositivo('pid', pid);
        }

        this.#inicio = inicio;
        this.#tamanio = tamanio;
        this.#pid = pid;
    }

    public get inicio(): number {
        return this.#inicio;
    }

    public get tamanio(): number {
        return this.#tamanio;
    }

    // Primera dirección después del bloque (no incluida)
    public get fin(): number {
        return this.#inicio + this.#tamanio;
    }

    public get pid(): number | null {
        return this.#pid;
    }

    public get libre(): boolean {
        return this.#pid === null;
    }

    // Ocupa el principio del bloque con el proceso. Si sobra espacio se divide;
    // si el ajuste es exacto no se genera un bloque de tamaño cero (RF04)
    public asignar(pid: number, tamanioSolicitado: number): DivisionBloque {
        if (!this.libre) {
            throw new OperacionMemoriaInvalidaError(`el bloque en ${this.#inicio} ya está ocupado`);
        }

        validarEnteroPositivo('memoria solicitada', tamanioSolicitado);

        if (tamanioSolicitado > this.#tamanio) {
            throw new OperacionMemoriaInvalidaError(
                `se pidieron ${tamanioSolicitado} KB y el bloque tiene ${this.#tamanio} KB`
            );
        }

        const ocupado = new BloqueMemoria(this.#inicio, tamanioSolicitado, pid);
        const sobrante = this.#tamanio - tamanioSolicitado;
        const restante = sobrante > 0 ? new BloqueMemoria(ocupado.fin, sobrante) : null;

        return { ocupado, restante };
    }

    // Devuelve el mismo tramo, ahora libre (RF05)
    public liberar(): BloqueMemoria {
        if (this.libre) {
            throw new OperacionMemoriaInvalidaError(`el bloque en ${this.#inicio} ya está libre`);
        }

        return new BloqueMemoria(this.#inicio, this.#tamanio);
    }

    // Une este bloque libre con el libre que le sigue inmediatamente (coalescencia)
    public fusionarCon(siguiente: BloqueMemoria): BloqueMemoria {
        if (!this.libre || !siguiente.libre) {
            throw new OperacionMemoriaInvalidaError('solo se pueden fusionar bloques libres');
        }

        if (this.fin !== siguiente.inicio) {
            throw new OperacionMemoriaInvalidaError(
                `los bloques no son contiguos (${this.fin} y ${siguiente.inicio})`
            );
        }

        return new BloqueMemoria(this.#inicio, this.#tamanio + siguiente.tamanio);
    }
}
