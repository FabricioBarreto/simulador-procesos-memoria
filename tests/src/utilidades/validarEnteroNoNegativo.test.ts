import { describe, test, expect } from 'vitest';
import { validarEnteroNoNegativo } from '../../../src/utilidades/validarEnteroNoNegativo';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';

describe('validarEnteroNoNegativo', () => {
    test.each([0, 1, 1023])('Debe aceptar %d', (valor) => {
        expect(() => validarEnteroNoNegativo('dato', valor)).not.toThrow();
    });

    test.each([-1, 0.5, NaN])('Debe rechazar %d con DatoInvalidoError', (valor) => {
        expect(() => validarEnteroNoNegativo('dato', valor)).toThrow(DatoInvalidoError);
    });
});
