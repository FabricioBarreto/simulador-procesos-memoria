import { ErrorDominio } from './ErrorDominio';

// Se lanza cuando un evento de Entrada/Salida no puede programarse en un
// proceso (RF08): nunca llegaría a dispararse o el proceso ya tiene uno.
export class EventoESInvalidoError extends ErrorDominio {
    override readonly name = 'EventoESInvalidoError';

    constructor(motivo: string) {
        super(`Evento de E/S inválido: ${motivo}`);
    }
}
