import { describe, test, expect } from 'vitest';
import { PlanificacionInvalidaError } from '../../../src/errores/PlanificacionInvalidaError';
import { ErrorDominio } from '../../../src/errores/ErrorDominio';

describe('PlanificacionInvalidaError', () => {
    // Verifica la herencia (es un ErrorDominio), el override de name y el mensaje
    test('Debe ser un ErrorDominio con nombre redefinido y el motivo en el mensaje', () => {
        const error = new PlanificacionInvalidaError('proceso duplicado');

        expect(error).toBeInstanceOf(ErrorDominio);
        expect(error.name).toBe('PlanificacionInvalidaError');
        expect(error.message).toBe('Planificación inválida: proceso duplicado');
    });
});
