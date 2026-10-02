import { EstadoProceso } from './EstadoProceso';
import { EventoES } from './EventoES';
import { TransicionInvalidaError } from '../errores/TransicionInvalidaError';
import { OperacionInvalidaError } from '../errores/OperacionInvalidaError';
import { EventoESInvalidoError } from '../errores/EventoESInvalidoError';
import { validarEnteroPositivo } from '../utilidades/validarEnteroPositivo';

// Representa un proceso del simulador (RF02, RF03).
// Doble encapsulamiento: los atributos son privados (#) y no hay setters;
// el estado solo cambia mediante operaciones que validan la transición.
export class Proceso {
    readonly #pid: number;
    readonly #memoriaRequerida: number;
    readonly #cpuTotal: number;
    #cpuRestante: number;
    #estado: EstadoProceso;
    #quantumConsumido: number;
    #bloqueoRestante: number;
    #eventoES: EventoES | null;

    constructor(pid: number, memoriaRequerida: number, cpuTotal: number) {
        // Se valida todo antes de asignar: si algo falla, el objeto no se crea
        validarEnteroPositivo('pid', pid);
        validarEnteroPositivo('memoria requerida', memoriaRequerida);
        validarEnteroPositivo('tiempo de CPU', cpuTotal);

        this.#pid = pid;
        this.#memoriaRequerida = memoriaRequerida;
        this.#cpuTotal = cpuTotal;
        this.#cpuRestante = cpuTotal;
        this.#estado = EstadoProceso.Nuevo;
        this.#quantumConsumido = 0;
        this.#bloqueoRestante = 0;
        this.#eventoES = null;
    }

    // Getters públicos (solo lectura, sin setters)
    public get pid(): number {
        return this.#pid;
    }

    public get memoriaRequerida(): number {
        return this.#memoriaRequerida;
    }

    public get cpuTotal(): number {
        return this.#cpuTotal;
    }

    public get cpuRestante(): number {
        return this.#cpuRestante;
    }

    // Valor derivado: no se guarda, se calcula (lo usará la E/S en RF08)
    public get cpuConsumida(): number {
        return this.#cpuTotal - this.#cpuRestante;
    }

    public get estado(): EstadoProceso {
        return this.#estado;
    }

    public get quantumConsumido(): number {
        return this.#quantumConsumido;
    }

    public get bloqueoRestante(): number {
        return this.#bloqueoRestante;
    }

    public get tieneEventoES(): boolean {
        return this.#eventoES !== null;
    }

    // Operaciones del dominio: cada una indica desde qué estados es válida

    // No hay bloque de memoria suficiente al intentar admitirlo
    public esperarMemoria(): void {
        this.#cambiarEstado([EstadoProceso.Nuevo], EstadoProceso.EsperandoMemoria);
    }

    // Se le asignó memoria: pasa a la cola de Listos
    public admitir(): void {
        this.#cambiarEstado([EstadoProceso.Nuevo, EstadoProceso.EsperandoMemoria], EstadoProceso.Listo);
    }

    // El planificador le da la CPU: arranca con el quantum en cero
    public despachar(): void {
        this.#cambiarEstado([EstadoProceso.Listo], EstadoProceso.Ejecutando);
        this.#quantumConsumido = 0;
    }

    // Agotó su quantum y hay otros Listos: vuelve al final de la cola
    public expulsar(): void {
        this.#cambiarEstado([EstadoProceso.Ejecutando], EstadoProceso.Listo);
    }

    // Consume una unidad de CPU (RF07). Orden de prioridad al final del tick:
    // 1) si la CPU llega a cero, termina; 2) si corresponde la E/S, se bloquea
    public ejecutarTick(): void {
        this.#exigirEstado(EstadoProceso.Ejecutando, 'ejecutar un tick');

        this.#cpuRestante--;
        this.#quantumConsumido++;

        if (this.#cpuRestante === 0) {
            this.#cambiarEstado([EstadoProceso.Ejecutando], EstadoProceso.Terminado);
            return;
        }

        const evento = this.#eventoES;

        if (evento !== null && this.cpuConsumida === evento.despuesDeCpu) {
            this.#bloquear(evento.duracion);
        }
    }

    // Programa un evento de E/S (RF08). Se rechaza si nunca llegaría a
    // dispararse (el proceso termina antes o ya pasó ese punto) o si ya hay uno
    public programarES(evento: EventoES): void {
        if (this.#eventoES !== null) {
            throw new EventoESInvalidoError('el proceso ya tiene un evento programado');
        }

        if (evento.despuesDeCpu <= this.cpuConsumida || evento.despuesDeCpu >= this.#cpuTotal) {
            throw new EventoESInvalidoError(
                `debe dispararse entre ${this.cpuConsumida + 1} y ${this.#cpuTotal - 1} ticks de CPU`
            );
        }

        this.#eventoES = evento;
    }

    // Fase de actualización de bloqueados: baja el temporizador y,
    // al llegar a cero, vuelve a Listo
    public avanzarBloqueo(): void {
        this.#exigirEstado(EstadoProceso.Bloqueado, 'avanzar el bloqueo');

        this.#bloqueoRestante--;

        if (this.#bloqueoRestante === 0) {
            this.#cambiarEstado([EstadoProceso.Bloqueado], EstadoProceso.Listo);
        }
    }

    // Agotó el quantum pero no hay otros Listos: sigue en CPU con el quantum
    // reiniciado, sin cambio de contexto (RF07)
    public renovarQuantum(): void {
        this.#exigirEstado(EstadoProceso.Ejecutando, 'renovar el quantum');
        this.#quantumConsumido = 0;
    }

    // Métodos privados

    // Único lugar donde se modifica #estado
    #cambiarEstado(origenesPermitidos: readonly EstadoProceso[], destino: EstadoProceso): void {
        if (!origenesPermitidos.includes(this.#estado)) {
            throw new TransicionInvalidaError(this.#estado, destino);
        }

        this.#estado = destino;
    }

    // Libera la CPU pero conserva la memoria (eso lo maneja el simulador).
    // El evento se consume: una vez disparado no vuelve a ocurrir
    #bloquear(duracion: number): void {
        this.#cambiarEstado([EstadoProceso.Ejecutando], EstadoProceso.Bloqueado);
        this.#bloqueoRestante = duracion;
        this.#eventoES = null;
    }

    // Para operaciones que no cambian de estado pero exigen estar en uno
    #exigirEstado(requerido: EstadoProceso, operacion: string): void {
        if (this.#estado !== requerido) {
            throw new OperacionInvalidaError(operacion, this.#estado);
        }
    }
}
