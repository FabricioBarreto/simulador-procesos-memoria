import { ErrorDominio } from './ErrorDominio';

// Se lanza cuando se pide al planificador algo que rompería sus reglas,
// por ejemplo encolar un proceso que no está Listo o que ya está en la cola.
export class PlanificacionInvalidaError extends ErrorDominio {
    override readonly name = 'PlanificacionInvalidaError';

    constructor(motivo: string) {
        super(`Planificación inválida: ${motivo}`);
    }
}
