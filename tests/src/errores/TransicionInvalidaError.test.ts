import { describe, test, expect } from 'vitest';
import { TransicionInvalidaError } from '../../../src/errores/TransicionInvalidaError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';

describe('TransicionInvalidaError', () => {
    test('Debe ser un ErrorDominio', () => {
        const error = new TransicionInvalidaError(EstadoProceso.Terminado, EstadoProceso.Listo);

        expect(error).toBeInstanceOf(ErrorDominio);
    });

    test('Debe redefinir el nombre con override', () => {
        const error = new TransicionInvalidaError(EstadoProceso.Terminado, EstadoProceso.Listo);

        expect(error.name).toBe('TransicionInvalidaError');
    });

    test('Debe indicar en el mensaje el estado de origen y el de destino', () => {
        const error = new TransicionInvalidaError(EstadoProceso.Nuevo, EstadoProceso.Ejecutando);

        expect(error.message).toBe('Transición inválida: NUEVO -> EJECUTANDO');
    });
});
