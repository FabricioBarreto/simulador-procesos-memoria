import { describe, test, expect } from 'vitest';
import { TransicionInvalidaError } from '../../../src/errores/TransicionInvalidaError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';

// Error que se lanza cuando un proceso intenta un cambio de estado prohibido
describe('TransicionInvalidaError', () => {
    // Herencia: es un ErrorDominio
    test('Debe ser un ErrorDominio', () => {
        const error = new TransicionInvalidaError(EstadoProceso.Terminado, EstadoProceso.Listo);

        expect(error).toBeInstanceOf(ErrorDominio);
    });

    // La subclase redefine la propiedad name con override
    test('Debe redefinir el nombre con override', () => {
        const error = new TransicionInvalidaError(EstadoProceso.Terminado, EstadoProceso.Listo);

        expect(error.name).toBe('TransicionInvalidaError');
    });

    // El mensaje muestra desde qué estado y hacia cuál se intentó pasar
    test('Debe indicar en el mensaje el estado de origen y el de destino', () => {
        const error = new TransicionInvalidaError(EstadoProceso.Nuevo, EstadoProceso.Ejecutando);

        expect(error.message).toBe('Transición inválida: NUEVO -> EJECUTANDO');
    });
});
