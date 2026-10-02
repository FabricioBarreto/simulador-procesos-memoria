import { ErrorDominio } from './ErrorDominio';
import { EstadoProceso } from '../modelos/EstadoProceso';

// Se lanza cuando se pide a un proceso una operación que no corresponde
// a su estado actual (por ejemplo, ejecutar un tick estando en Listo).
export class OperacionInvalidaError extends ErrorDominio {
    override readonly name = 'OperacionInvalidaError';

    constructor(operacion: string, estado: EstadoProceso) {
        super(`No se puede ${operacion} en estado ${estado}`);
    }
}
