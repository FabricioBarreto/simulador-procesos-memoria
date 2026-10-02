import { DatoInvalidoError } from '../errores/DatoInvalidoError';

// Regla que se repite en todo el dominio (PID, memoria, CPU, quantum, E/S):
// el valor debe ser un entero mayor que cero. Se centraliza para no duplicarla.
export function validarEnteroPositivo(campo: string, valor: number): void {
    if (!Number.isInteger(valor) || valor <= 0) {
        throw new DatoInvalidoError(campo, valor);
    }
}
