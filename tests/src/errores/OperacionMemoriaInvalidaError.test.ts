import { describe, test, expect } from 'vitest';
import { OperacionMemoriaInvalidaError } from '../../../src/errores/OperacionMemoriaInvalidaError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';

// Error para operaciones de memoria que romperían sus reglas (RF04, RF05)
describe('OperacionMemoriaInvalidaError', () => {
    // Verifica la herencia (es un ErrorDominio), el override de name y el mensaje
    test('Debe ser un ErrorDominio con nombre redefinido y el motivo en el mensaje', () => {
        const error = new OperacionMemoriaInvalidaError('bloque ocupado');

        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error.name).toBe('OperacionMemoriaInvalidaError');
        expect(error.message).toBe('Operación de memoria inválida: bloque ocupado');
    });
});
