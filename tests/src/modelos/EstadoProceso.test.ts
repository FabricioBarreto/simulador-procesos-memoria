import { describe, test, expect } from 'vitest';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';

describe('EstadoProceso', () => {
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
