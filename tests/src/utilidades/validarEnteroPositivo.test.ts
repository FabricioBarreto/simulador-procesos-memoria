import { describe, test, expect } from 'vitest';
import { validarEnteroPositivo } from '../../../src/utilidades/validarEnteroPositivo';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';

// Regla común del dominio: PID, memoria, CPU, quantum y E/S son enteros positivos
describe('validarEnteroPositivo', () => {
    // Casos válidos: enteros mayores que cero
    test.each([1, 2, 1024])('Debe aceptar el entero positivo %d', (valor) => {
        expect(() => validarEnteroPositivo('dato', valor)).not.toThrow();
    });

    // Casos límite e inválidos: cero, negativos, decimales, NaN e infinito
    test.each([0, -1, 1.5, NaN, Infinity])('Debe rechazar %d con DatoInvalidoError', (valor) => {
        expect(() => validarEnteroPositivo('dato', valor)).toThrow(DatoInvalidoError);
    });
});
