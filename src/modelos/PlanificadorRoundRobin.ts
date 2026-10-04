import { IPlanificador } from '../interfaces/IPlanificador';
import { Proceso } from './Proceso';
import { EstadoProceso } from './EstadoProceso';
import { PlanificacionInvalidaError } from '../errores/PlanificacionInvalidaError';
import { validarEnteroPositivo } from '../utilidades/validarEnteroPositivo';

// Planificador Round Robin (RF07): una cola FIFO de Listos y un quantum fijo.
// Es la fase 3 de cada tick: despacho y ejecución de UNA unidad de CPU.
// Contador de cambios de contexto según la convención de RF09: solo cuenta
// la expulsión por quantum (con otros Listos) y el bloqueo por E/S.
export class PlanificadorRoundRobin implements IPlanificador {
    readonly #quantum: number;
    readonly #colaListos: Proceso[];
    #procesoEnCpu: Proceso | null;
    #cambiosContexto: number;

    constructor(quantum: number) {
        validarEnteroPositivo('quantum', quantum);

        this.#quantum = quantum;
        this.#colaListos = [];
        this.#procesoEnCpu = null;
        this.#cambiosContexto = 0;
    }

    public get quantum(): number {
        return this.#quantum;
    }

    public get procesoEnCpu(): Proceso | null {
        return this.#procesoEnCpu;
    }

    // Copia de la cola: desde afuera no se puede reordenar ni agregar procesos
    public get colaListos(): readonly Proceso[] {
        return [...this.#colaListos];
    }

    public get cambiosContexto(): number {
        return this.#cambiosContexto;
    }

    // Agrega un proceso Listo al FINAL de la cola (FIFO)
    public encolar(proceso: Proceso): void {
        if (proceso.estado !== EstadoProceso.Listo) {
            throw new PlanificacionInvalidaError(`el proceso ${proceso.pid} no está Listo (${proceso.estado})`);
        }

        if (this.#colaListos.includes(proceso)) {
            throw new PlanificacionInvalidaError(`el proceso ${proceso.pid} ya está en la cola de Listos`);
        }

        this.#colaListos.push(proceso);
    }

    // Ejecuta una unidad de CPU y devuelve el proceso que la usó (o null si
    // la CPU estuvo libre). Como máximo un proceso consume CPU por tick (RF06)
    public ejecutarTick(): Proceso | null {
        // 1) Si la CPU está libre, se despacha el primero de la cola
        if (this.#procesoEnCpu === null) {
            this.#despacharSiguiente();
        }

        const proceso = this.#procesoEnCpu;

        if (proceso === null) {
            return null;
        }

        // 2) El proceso consume una unidad de CPU (puede terminar o bloquearse)
        proceso.ejecutarTick();

        // 3) Se decide qué pasa con la CPU, en orden de prioridad
        this.#resolverFinDeTick(proceso);

        return proceso;
    }

    // Métodos privados

    #despacharSiguiente(): void {
        const siguiente = this.#colaListos.shift();

        if (siguiente !== undefined) {
            siguiente.despachar(); // el despacho inicial NO cuenta como cambio de contexto
            this.#procesoEnCpu = siguiente;
        }
    }

    // Prioridades (RF07 y RF08): finalización > bloqueo por E/S > quantum
    #resolverFinDeTick(proceso: Proceso): void {
        if (proceso.estado === EstadoProceso.Terminado) {
            // Termina: libera la CPU; otro proceso entra recién en el próximo tick
            this.#procesoEnCpu = null;
            return;
        }

        if (proceso.estado === EstadoProceso.Bloqueado) {
            // Se bloqueó por E/S: libera la CPU y cuenta un cambio de contexto
            this.#procesoEnCpu = null;
            this.#cambiosContexto++;
            return;
        }

        if (proceso.quantumConsumido >= this.#quantum) {
            this.#resolverQuantumAgotado(proceso);
        }
    }

    #resolverQuantumAgotado(proceso: Proceso): void {
        if (this.#colaListos.length === 0) {
            // Nadie más espera: sigue en CPU con quantum nuevo, sin cambio de contexto
            proceso.renovarQuantum();
            return;
        }

        // Hay otros Listos: vuelve al final de la cola y cuenta un cambio de contexto
        proceso.expulsar();
        this.#colaListos.push(proceso);
        this.#procesoEnCpu = null;
        this.#cambiosContexto++;
    }
}
