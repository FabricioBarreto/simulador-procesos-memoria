import { describe, test, expect } from 'vitest';
import { EventoES } from '../../../src/modelos/EventoES';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';

describe('EventoES', () => {
    test('Debe crearse con el momento de disparo y la duración', () => {
        const evento = new EventoES(2, 3);

        expect(evento.despuesDeCpu).toBe(2);
        expect(evento.duracion).toBe(3);
    });

    test.each([
        [0, 3],
        [-1, 3],
        [2, 0],
        [2, 1.5],
    ])('Debe rechazar valores inválidos (despuesDeCpu=%d, duracion=%d)', (despuesDeCpu, duracion) => {
        expect(() => new EventoES(despuesDeCpu, duracion)).toThrow(DatoInvalidoError);
    });
});
