import { describe, test, expect } from 'vitest';
import { EventoES } from '../../../src/modelos/EventoES';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';

// RF08: evento determinista de Entrada/Salida que se define desde los tests
describe('EventoES', () => {
    // Guarda después de cuántos ticks de CPU se dispara y cuántos ticks dura
    test('Debe crearse con el momento de disparo y la duración', () => {
        const evento = new EventoES(2, 3);

        expect(evento.despuesDeCpu).toBe(2);
        expect(evento.duracion).toBe(3);
    });

    // Ambos valores deben ser enteros positivos (validación documentada de RF08)
    test.each([
        [0, 3],
        [-1, 3],
        [2, 0],
        [2, 1.5],
    ])('Debe rechazar valores inválidos (despuesDeCpu=%d, duracion=%d)', (despuesDeCpu, duracion) => {
        expect(() => new EventoES(despuesDeCpu, duracion)).toThrow(DatoInvalidoError);
    });
});
