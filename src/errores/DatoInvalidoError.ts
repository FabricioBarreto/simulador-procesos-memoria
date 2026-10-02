import { ErrorDominio } from './ErrorDominio';

// Se lanza cuando un valor de entrada no cumple las reglas del dominio
// (por ejemplo, memoria o quantum que no son enteros positivos).
export class DatoInvalidoError extends ErrorDominio {
    override readonly name = 'DatoInvalidoError';

    constructor(campo: string, valor: number) {
        super(`${campo} debe ser un entero positivo (recibido: ${valor})`);
    }
}
