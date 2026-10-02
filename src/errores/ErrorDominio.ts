// Clase abstracta: nadie lanza un "ErrorDominio" genérico, siempre uno concreto.
// Sirve como base común para distinguir los errores de reglas del simulador
// de los errores propios de JavaScript (TypeError, RangeError, etc.).
export abstract class ErrorDominio extends Error {
    constructor(mensaje: string) {
        super(mensaje);
    }
}
