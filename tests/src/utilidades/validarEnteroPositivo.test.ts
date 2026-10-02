import { describe, test, expect } from 'vitest';
import { validarEnteroPositivo } from '../../../src/utilidades/validarEnteroPositivo';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';

describe('validarEnteroPositivo', () => {
    test.each([1, 2, 1024])('Debe aceptar el entero positivo %d', (valor) => {
        expect(() => validarEnteroPositivo('dato', valor)).not.toThrow();
    });

    test.each([0, -1, 1.5, NaN, Infinity])('Debe rechazar %d con DatoInvalidoError', (valor) => {
        expect(() => validarEnteroPositivo('dato', valor)).toThrow(DatoInvalidoError);
    });
});
