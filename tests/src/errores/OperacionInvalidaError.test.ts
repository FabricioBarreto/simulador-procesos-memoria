import { describe, test, expect } from 'vitest';
import { OperacionInvalidaError } from '../../../src/errores/OperacionInvalidaError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';

// Error para operaciones que exigen un estado (por ejemplo, ejecutar CPU estando en Listo)
describe('OperacionInvalidaError', () => {
    // Herencia (es un ErrorDominio) y override de name
    test('Debe ser un ErrorDominio con nombre redefinido', () => {
        const error = new OperacionInvalidaError('ejecutar un tick', EstadoProceso.Listo);

        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error.name).toBe('OperacionInvalidaError');
    });

    // El mensaje dice qué operación se pidió y en qué estado estaba el proceso
    test('Debe indicar en el mensaje la operación y el estado actual', () => {
        const error = new OperacionInvalidaError('ejecutar un tick', EstadoProceso.Listo);

        expect(error.message).toBe('No se puede ejecutar un tick en estado LISTO');
    });
});
