import { Proceso } from '../modelos/Proceso';

// Contrato del planificador de CPU (RF07).
// Administra la única CPU y la cola de Listos; no sabe nada de memoria.
export interface IPlanificador {
    readonly quantum: number;
    readonly procesoEnCpu: Proceso | null;
    readonly colaListos: readonly Proceso[];
    readonly cambiosContexto: number;

    encolar(proceso: Proceso): void;
    ejecutarTick(): Proceso | null;
}
