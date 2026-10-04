import { describe, test, expect } from 'vitest';
import { RegistroInvalidoError } from '../../../src/errores/RegistroInvalidoError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';

describe('RegistroInvalidoError', () => {
    // Verifica la herencia (es un ErrorDominio), el override de name y el mensaje
    test('Debe ser un ErrorDominio con nombre redefinido y el motivo en el mensaje', () => {
        const error = new RegistroInvalidoError('PID repetido');

        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error.name).toBe('RegistroInvalidoError');
        expect(error.message).toBe('Registro inválido: PID repetido');
    });
});
