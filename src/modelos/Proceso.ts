import { EstadoProceso } from './EstadoProceso';
import { TransicionInvalidaError } from '../errores/TransicionInvalidaError';
import { OperacionInvalidaError } from '../errores/OperacionInvalidaError';
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

    // Consume una unidad de CPU (RF07). Si llega a cero, termina en este mismo tick
    public ejecutarTick(): void {
        this.#exigirEstado(EstadoProceso.Ejecutando, 'ejecutar un tick');

        this.#cpuRestante--;
        this.#quantumConsumido++;

        if (this.#cpuRestante === 0) {
            this.#cambiarEstado([EstadoProceso.Ejecutando], EstadoProceso.Terminado);
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

    // Para operaciones que no cambian de estado pero exigen estar en uno
    #exigirEstado(requerido: EstadoProceso, operacion: string): void {
        if (this.#estado !== requerido) {
            throw new OperacionInvalidaError(operacion, this.#estado);
        }
    }
}
