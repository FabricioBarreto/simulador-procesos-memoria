import { EstadoProceso } from './EstadoProceso';
import { TransicionInvalidaError } from '../errores/TransicionInvalidaError';
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

    // Método privado: único lugar donde se modifica #estado
    #cambiarEstado(origenesPermitidos: readonly EstadoProceso[], destino: EstadoProceso): void {
        if (!origenesPermitidos.includes(this.#estado)) {
            throw new TransicionInvalidaError(this.#estado, destino);
        }

        this.#estado = destino;
    }
}
