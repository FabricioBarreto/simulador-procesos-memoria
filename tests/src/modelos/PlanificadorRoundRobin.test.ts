import { describe, test, expect } from 'vitest';
import { PlanificadorRoundRobin } from '../../../src/modelos/PlanificadorRoundRobin';
import { Proceso } from '../../../src/modelos/Proceso';
import { EventoES } from '../../../src/modelos/EventoES';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { PlanificacionInvalidaError } from '../../../src/errores/PlanificacionInvalidaError';

// Ayuda: crea un proceso ya admitido (Listo), como lo entregaría el simulador
function procesoListo(pid: number, cpu: number): Proceso {
    const proceso = new Proceso(pid, 100, cpu);
    proceso.admitir();
    return proceso;
}

// Ayuda: ejecuta N ticks y devuelve qué PID usó la CPU en cada uno (null = CPU libre)
function ejecutar(planificador: PlanificadorRoundRobin, ticks: number): (number | null)[] {
    const traza: (number | null)[] = [];

    for (let i = 0; i < ticks; i++) {
        traza.push(planificador.ejecutarTick()?.pid ?? null);
    }

    return traza;
}

describe('PlanificadorRoundRobin - creación', () => {
    // RF01: arranca con la CPU libre, la cola vacía y el contador en cero
    test('Debe arrancar con la CPU libre, la cola vacía y sin cambios de contexto', () => {
        const planificador = new PlanificadorRoundRobin(2);

        expect(planificador.quantum).toBe(2);
        expect(planificador.procesoEnCpu).toBeNull();
        expect(planificador.colaListos).toEqual([]);
        expect(planificador.cambiosContexto).toBe(0);
    });

    // RF01: el quantum debe ser un entero positivo
    test.each([0, -2, 1.5])('Debe rechazar un quantum inválido (%d)', (quantum) => {
        expect(() => new PlanificadorRoundRobin(quantum)).toThrow(DatoInvalidoError);
    });
});

describe('PlanificadorRoundRobin - cola de Listos', () => {
    // RF07: la cola es FIFO, se respeta el orden de llegada
    test('Debe encolar al final respetando el orden de llegada', () => {
        const planificador = new PlanificadorRoundRobin(2);
        const p1 = procesoListo(1, 3);
        const p2 = procesoListo(2, 3);

        planificador.encolar(p1);
        planificador.encolar(p2);

        expect(planificador.colaListos.map((p) => p.pid)).toEqual([1, 2]);
    });

    // Solo entran procesos en estado Listo (por ejemplo, no uno Nuevo sin memoria)
    test('No debe encolar un proceso que no está Listo', () => {
        const planificador = new PlanificadorRoundRobin(2);

        expect(() => planificador.encolar(new Proceso(1, 100, 3))).toThrow(PlanificacionInvalidaError);
    });

    // RF10: no puede haber procesos duplicados en la cola
    test('No debe encolar dos veces el mismo proceso', () => {
        const planificador = new PlanificadorRoundRobin(2);
        const p1 = procesoListo(1, 3);
        planificador.encolar(p1);

        expect(() => planificador.encolar(p1)).toThrow(PlanificacionInvalidaError);
    });

    // Doble encapsulamiento: la cola que se devuelve es una copia
    test('No debe permitir modificar la cola desde afuera', () => {
        const planificador = new PlanificadorRoundRobin(2);
        planificador.encolar(procesoListo(1, 3));

        (planificador.colaListos as Proceso[]).pop();

        expect(planificador.colaListos).toHaveLength(1);
    });
});

describe('PlanificadorRoundRobin - ejecución por ticks (RF07)', () => {
    // Sin procesos listos la CPU queda libre ese tick
    test('Con la cola vacía no ejecuta nada y devuelve null', () => {
        const planificador = new PlanificadorRoundRobin(2);

        expect(planificador.ejecutarTick()).toBeNull();
    });

    // Caso mínimo "Round Robin": Q=2, P1 con CPU 3 y P2 con CPU 2
    // Se espera P1, P1, P2, P2, P1 y un solo cambio de contexto (P1 expulsado en el tick 2)
    test('Caso mínimo: ejecuta P1, P1, P2, P2, P1 con un cambio de contexto', () => {
        const planificador = new PlanificadorRoundRobin(2);
        const p1 = procesoListo(1, 3);
        const p2 = procesoListo(2, 2);
        planificador.encolar(p1);
        planificador.encolar(p2);

        expect(ejecutar(planificador, 5)).toEqual([1, 1, 2, 2, 1]);
        expect(planificador.cambiosContexto).toBe(1);
        expect(p1.estado).toBe(EstadoProceso.Terminado);
        expect(p2.estado).toBe(EstadoProceso.Terminado);
    });

    // Caso mínimo "Quantum y finalización" (1): un único proceso renueva el
    // quantum sin cambio de contexto porque no hay nadie más esperando
    test('Un único proceso renueva el quantum sin cambio de contexto', () => {
        const planificador = new PlanificadorRoundRobin(2);
        planificador.encolar(procesoListo(1, 5));

        expect(ejecutar(planificador, 5)).toEqual([1, 1, 1, 1, 1]);
        expect(planificador.cambiosContexto).toBe(0);
    });

    // Caso mínimo "Quantum y finalización" (2): P1 termina justo al agotar el
    // quantum. La finalización tiene prioridad: no se reencola ni cuenta cambio
    test('Terminar en el límite del quantum no reencola al proceso', () => {
        const planificador = new PlanificadorRoundRobin(2);
        const p1 = procesoListo(1, 2);
        planificador.encolar(p1);
        planificador.encolar(procesoListo(2, 2));

        ejecutar(planificador, 2);

        expect(p1.estado).toBe(EstadoProceso.Terminado);
        expect(planificador.colaListos.map((p) => p.pid)).toEqual([2]);
        expect(planificador.procesoEnCpu).toBeNull();
        expect(planificador.cambiosContexto).toBe(0);
    });

    // RF07: cuando un proceso termina, el siguiente entra recién en el próximo tick
    test('Después de terminar un proceso, el siguiente se despacha en el tick siguiente', () => {
        const planificador = new PlanificadorRoundRobin(2);
        planificador.encolar(procesoListo(1, 1));
        planificador.encolar(procesoListo(2, 1));

        expect(ejecutar(planificador, 3)).toEqual([1, 2, null]);
    });

    // Al despachar se reinicia el quantum consumido
    test('El proceso en CPU es el despachado y arranca su ráfaga con quantum en cero', () => {
        const planificador = new PlanificadorRoundRobin(3);
        const p1 = procesoListo(1, 5);
        planificador.encolar(p1);

        planificador.ejecutarTick();

        expect(planificador.procesoEnCpu).toBe(p1);
        expect(p1.quantumConsumido).toBe(1);
    });
});

describe('PlanificadorRoundRobin - bloqueo por E/S (RF08)', () => {
    // Caso mínimo "Bloqueo por E/S": al bloquearse libera la CPU y cuenta un cambio de contexto
    test('Al bloquearse libera la CPU, no vuelve a la cola y cuenta un cambio de contexto', () => {
        const planificador = new PlanificadorRoundRobin(2);
        const p1 = procesoListo(1, 4);
        p1.programarES(new EventoES(1, 2));
        planificador.encolar(p1);
        planificador.encolar(procesoListo(2, 2));

        planificador.ejecutarTick();

        expect(p1.estado).toBe(EstadoProceso.Bloqueado);
        expect(planificador.procesoEnCpu).toBeNull();
        expect(planificador.colaListos.map((p) => p.pid)).toEqual([2]);
        expect(planificador.cambiosContexto).toBe(1);
    });

    // RF08: el bloqueo tiene prioridad sobre la rotación por quantum.
    // Con Q=1 el quantum se agota en el mismo tick del bloqueo: cuenta UN solo cambio
    test('El bloqueo tiene prioridad sobre el quantum: un solo cambio de contexto', () => {
        const planificador = new PlanificadorRoundRobin(1);
        const p1 = procesoListo(1, 3);
        p1.programarES(new EventoES(1, 1));
        planificador.encolar(p1);
        planificador.encolar(procesoListo(2, 2));

        planificador.ejecutarTick();

        expect(p1.estado).toBe(EstadoProceso.Bloqueado);
        expect(planificador.colaListos.map((p) => p.pid)).toEqual([2]);
        expect(planificador.cambiosContexto).toBe(1);
    });
});

describe('PlanificadorRoundRobin - retirar un proceso (finalización forzada)', () => {
    // Si está en la cola, se lo saca sin alterar el orden de los demás
    test('Retira un proceso de la cola de Listos', () => {
        const planificador = new PlanificadorRoundRobin(2);
        const p2 = procesoListo(2, 3);
        planificador.encolar(procesoListo(1, 3));
        planificador.encolar(p2);
        planificador.encolar(procesoListo(3, 3));

        planificador.retirar(p2);

        expect(planificador.colaListos.map((p) => p.pid)).toEqual([1, 3]);
    });

    // Si está en la CPU, la CPU queda libre y no cuenta cambio de contexto
    test('Retira el proceso en CPU y la deja libre sin contar cambio de contexto', () => {
        const planificador = new PlanificadorRoundRobin(2);
        const p1 = procesoListo(1, 5);
        planificador.encolar(p1);
        planificador.ejecutarTick();

        planificador.retirar(p1);

        expect(planificador.procesoEnCpu).toBeNull();
        expect(planificador.cambiosContexto).toBe(0);
    });

    // Si no está ni en la CPU ni en la cola, no pasa nada
    test('Retirar un proceso que no está no modifica nada', () => {
        const planificador = new PlanificadorRoundRobin(2);
        planificador.encolar(procesoListo(1, 3));

        planificador.retirar(procesoListo(9, 3));

        expect(planificador.colaListos.map((p) => p.pid)).toEqual([1]);
    });
});
