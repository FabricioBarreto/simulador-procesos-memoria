import { ErrorDominio } from './ErrorDominio';
import { EstadoProceso } from '../modelos/EstadoProceso';

// Se lanza cuando se intenta llevar un proceso a un estado al que no puede
// pasar desde el actual (por ejemplo, de Terminado a Listo).
export class TransicionInvalidaError extends ErrorDominio {
    override readonly name = 'TransicionInvalidaError';

    constructor(desde: EstadoProceso, hacia: EstadoProceso) {
        super(`Transición inválida: ${desde} -> ${hacia}`);
    }
}
