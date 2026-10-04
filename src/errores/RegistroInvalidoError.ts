import { ErrorDominio } from './ErrorDominio';

// Se lanza cuando no se puede registrar un proceso en el simulador (RF02):
// PID repetido o memoria requerida mayor que la memoria total.
export class RegistroInvalidoError extends ErrorDominio {
    override readonly name = 'RegistroInvalidoError';

    constructor(motivo: string) {
        super(`Registro inválido: ${motivo}`);
    }
}
