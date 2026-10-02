import { IGestorMemoria } from '../interfaces/IGestorMemoria';
import { IEstrategiaAsignacion } from '../interfaces/IEstrategiaAsignacion';
import { BloqueMemoria } from './BloqueMemoria';
import { OperacionMemoriaInvalidaError } from '../errores/OperacionMemoriaInvalidaError';
import { validarEnteroPositivo } from '../utilidades/validarEnteroPositivo';

// Administra la memoria contigua como una lista de bloques ordenada por dirección.
// Invariantes que protege: los bloques cubren toda la memoria, sin huecos ni
// solapamientos, y nunca quedan dos bloques libres juntos (siempre se fusionan).
// La política de asignación se recibe por constructor (composición + polimorfismo).
export class GestorMemoria implements IGestorMemoria {
    readonly #memoriaTotal: number;
    readonly #estrategia: IEstrategiaAsignacion;
    #bloques: BloqueMemoria[];

    constructor(memoriaTotal: number, estrategia: IEstrategiaAsignacion) {
        validarEnteroPositivo('memoria total', memoriaTotal);

        this.#memoriaTotal = memoriaTotal;
        this.#estrategia = estrategia;
        // RF01: se arranca con un único bloque libre que abarca toda la memoria
        this.#bloques = [new BloqueMemoria(0, memoriaTotal)];
    }

    public get memoriaTotal(): number {
        return this.#memoriaTotal;
    }

    public get politica(): string {
        return this.#estrategia.nombre;
    }

    // Se devuelve una COPIA de la lista: quien la reciba no puede agregar ni
    // quitar bloques. Los bloques en sí son inmutables, así que no hace falta copiarlos
    public get bloques(): readonly BloqueMemoria[] {
        return [...this.#bloques];
    }

    public get memoriaOcupada(): number {
        return this.#memoriaTotal - this.memoriaLibreTotal;
    }

    public get memoriaLibreTotal(): number {
        return this.#bloquesLibres().reduce((suma, bloque) => suma + bloque.tamanio, 0);
    }

    public get mayorBloqueLibre(): number {
        return Math.max(0, ...this.#bloquesLibres().map((bloque) => bloque.tamanio));
    }

    public tieneMemoria(pid: number): boolean {
        return this.#bloques.some((bloque) => bloque.pid === pid);
    }

    // RF04: la estrategia elige el bloque. Si ninguno alcanza devuelve false
    // y la memoria queda exactamente igual (aunque la suma libre alcance)
    public asignar(pid: number, tamanio: number): boolean {
        if (this.tieneMemoria(pid)) {
            throw new OperacionMemoriaInvalidaError(`el proceso ${pid} ya tiene memoria asignada`);
        }

        const elegido = this.#estrategia.elegirBloque(this.#bloques, tamanio);

        if (elegido === null) {
            return false;
        }

        const { ocupado, restante } = elegido.asignar(pid, tamanio);
        const indice = this.#bloques.indexOf(elegido);
        const reemplazo = restante === null ? [ocupado] : [ocupado, restante];

        this.#bloques.splice(indice, 1, ...reemplazo);
        return true;
    }

    // RF05: libera el bloque del proceso y lo fusiona con los vecinos libres
    public liberar(pid: number): void {
        const indice = this.#bloques.findIndex((bloque) => bloque.pid === pid);

        if (indice === -1) {
            throw new OperacionMemoriaInvalidaError(`el proceso ${pid} no tiene memoria asignada`);
        }

        this.#bloques[indice] = this.#bloques[indice].liberar();
        this.#coalescer(indice);
    }

    // Métodos privados

    // Fusiona el bloque libre de la posición indicada con su vecino derecho y
    // con su vecino izquierdo si también están libres. No mueve bloques
    // ocupados: no es compactación
    #coalescer(indice: number): void {
        const derecho = this.#bloques[indice + 1];

        if (derecho !== undefined && derecho.libre) {
            this.#bloques.splice(indice, 2, this.#bloques[indice].fusionarCon(derecho));
        }

        const izquierdo = this.#bloques[indice - 1];

        if (izquierdo !== undefined && izquierdo.libre) {
            this.#bloques.splice(indice - 1, 2, izquierdo.fusionarCon(this.#bloques[indice]));
        }
    }

    #bloquesLibres(): BloqueMemoria[] {
        return this.#bloques.filter((bloque) => bloque.libre);
    }
}
