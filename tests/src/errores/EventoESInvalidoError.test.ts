import { describe, test, expect } from 'vitest';
import { EventoESInvalidoError } from '../../../src/errores/EventoESInvalidoError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';

// Error para eventos de E/S que no se pueden programar (RF08)
describe('EventoESInvalidoError', () => {
    // Verifica la herencia (es un ErrorDominio), el override de name y el mensaje
    test('Debe ser un ErrorDominio con nombre redefinido y el motivo en el mensaje', () => {
        const error = new EventoESInvalidoError('ya tiene uno');

        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error.name).toBe('EventoESInvalidoError');
        expect(error.message).toBe('Evento de E/S inválido: ya tiene uno');
    });
});
