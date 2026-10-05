import { describe, test, expect } from 'vitest';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';

// RF03: los estados del ciclo de vida de un proceso
describe('EstadoProceso', () => {
    // Están los 6 estados que pide la consigna, ni uno más ni uno menos
    test('Debe tener exactamente los seis estados del ciclo de vida', () => {
        expect(Object.values(EstadoProceso)).toEqual([
            'NUEVO',
            'ESPERANDO_MEMORIA',
            'LISTO',
            'EJECUTANDO',
            'BLOQUEADO',
            'TERMINADO',
        ]);
    });
});
