import { ErrorDominio } from './ErrorDominio';

// Se lanza cuando un valor de entrada no cumple las reglas del dominio
// (por ejemplo, memoria o quantum que no son enteros positivos).
// El requisito es configurable para reutilizarlo con otras reglas
// (por ejemplo, una dirección de memoria puede ser cero).
export class DatoInvalidoError extends ErrorDominio {
    override readonly name = 'DatoInvalidoError';

    constructor(campo: string, valor: number, requisito: string = 'un entero positivo') {
        super(`${campo} debe ser ${requisito} (recibido: ${valor})`);
    }
}
