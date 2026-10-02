import { describe, test, expect } from 'vitest';
import { OperacionMemoriaInvalidaError } from '../../../src/errores/OperacionMemoriaInvalidaError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';

describe('OperacionMemoriaInvalidaError', () => {
    test('Debe ser un ErrorDominio con nombre redefinido y el motivo en el mensaje', () => {
        const error = new OperacionMemoriaInvalidaError('bloque ocupado');

        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error.name).toBe('OperacionMemoriaInvalidaError');
        expect(error.message).toBe('Operación de memoria inválida: bloque ocupado');
    });
});
