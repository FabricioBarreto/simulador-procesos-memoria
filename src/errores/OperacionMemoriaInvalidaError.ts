import { ErrorDominio } from './ErrorDominio';

// Se lanza cuando se pide sobre un bloque de memoria una operación que
// rompería sus reglas (asignar uno ocupado, fusionar bloques no contiguos, etc.)
export class OperacionMemoriaInvalidaError extends ErrorDominio {
    override readonly name = 'OperacionMemoriaInvalidaError';

    constructor(motivo: string) {
        super(`Operación de memoria inválida: ${motivo}`);
    }
}
