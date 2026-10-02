import { describe, test, expect } from 'vitest';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';

describe('DatoInvalidoError', () => {
    test('Debe ser un ErrorDominio y también un Error', () => {
        const error = new DatoInvalidoError('quantum', 0);

        expect(error).toBeInstanceOf(DatoInvalidoError);
        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error).toBeInstanceOf(Error);
    });

    test('Debe redefinir el nombre con override', () => {
        const error = new DatoInvalidoError('quantum', 0);

        expect(error.name).toBe('DatoInvalidoError');
    });

    test('Debe indicar en el mensaje el campo y el valor recibido', () => {
        const error = new DatoInvalidoError('memoria total', -5);

        expect(error.message).toBe('memoria total debe ser un entero positivo (recibido: -5)');
    });

    test('Debe poder lanzarse y capturarse como ErrorDominio', () => {
        const lanzar = () => {
            throw new DatoInvalidoError('pid', 1.5);
        };

        expect(lanzar).toThrow(ErrorDominio);
    });
});
