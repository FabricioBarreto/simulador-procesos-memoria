import { describe, test, expect } from 'vitest';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';

// Error que se lanza cuando un dato no cumple las reglas (por ejemplo, un quantum de 0)
describe('DatoInvalidoError', () => {
    // Herencia: DatoInvalidoError "es un" ErrorDominio, que a su vez "es un" Error
    test('Debe ser un ErrorDominio y también un Error', () => {
        const error = new DatoInvalidoError('quantum', 0);

        expect(error).toBeInstanceOf(DatoInvalidoError);
        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error).toBeInstanceOf(Error);
    });

    // La subclase redefine la propiedad name con override
    test('Debe redefinir el nombre con override', () => {
        const error = new DatoInvalidoError('quantum', 0);

        expect(error.name).toBe('DatoInvalidoError');
    });

    // El mensaje dice qué campo falló y qué valor llegó, para entender el error rápido
    test('Debe indicar en el mensaje el campo y el valor recibido', () => {
        const error = new DatoInvalidoError('memoria total', -5);

        expect(error.message).toBe('memoria total debe ser un entero positivo (recibido: -5)');
    });

    // Sustitución: se puede capturar como la clase base sin saber cuál es la subclase
    test('Debe poder lanzarse y capturarse como ErrorDominio', () => {
        const lanzar = () => {
            throw new DatoInvalidoError('pid', 1.5);
        };

        expect(lanzar).toThrow(ErrorDominio);
    });
});

describe('DatoInvalidoError - requisito personalizado', () => {
    // El requisito es opcional: se usa, por ejemplo, para direcciones que pueden ser cero
    test('Debe permitir indicar otro requisito en el mensaje', () => {
        const error = new DatoInvalidoError('inicio del bloque', -1, 'un entero mayor o igual a cero');

        expect(error.message).toBe('inicio del bloque debe ser un entero mayor o igual a cero (recibido: -1)');
    });
});
