import { describe, test, expect } from 'vitest';
import { validarEnteroNoNegativo } from '../../../src/utilidades/validarEnteroNoNegativo';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';

// Variante que acepta el cero (por ejemplo, la dirección de inicio de la memoria)
describe('validarEnteroNoNegativo', () => {
    // Casos válidos: el cero y enteros positivos
    test.each([0, 1, 1023])('Debe aceptar %d', (valor) => {
        expect(() => validarEnteroNoNegativo('dato', valor)).not.toThrow();
    });

    // Casos inválidos: negativos, decimales y NaN
    test.each([-1, 0.5, NaN])('Debe rechazar %d con DatoInvalidoError', (valor) => {
        expect(() => validarEnteroNoNegativo('dato', valor)).toThrow(DatoInvalidoError);
    });
});
