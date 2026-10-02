import { DatoInvalidoError } from '../errores/DatoInvalidoError';

// Para valores que pueden ser cero, como la dirección de inicio de un bloque
export function validarEnteroNoNegativo(campo: string, valor: number): void {
    if (!Number.isInteger(valor) || valor < 0) {
        throw new DatoInvalidoError(campo, valor, 'un entero mayor o igual a cero');
    }
}
