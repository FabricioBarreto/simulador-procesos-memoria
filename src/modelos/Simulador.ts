import { ISimulador } from '../interfaces/ISimulador';
import { IGestorMemoria } from '../interfaces/IGestorMemoria';
import { IPlanificador } from '../interfaces/IPlanificador';
import { ConfiguracionSimulacion } from '../interfaces/ConfiguracionSimulacion';
import { VistaProceso } from '../interfaces/VistaProceso';
import { GestorMemoria } from './GestorMemoria';
import { PlanificadorRoundRobin } from './PlanificadorRoundRobin';
import { Proceso } from './Proceso';
import { EstadoProceso } from './EstadoProceso';
import { EventoES } from './EventoES';
import { Metricas } from './Metricas';
import { BloqueMemoria } from './BloqueMemoria';
import { FirstFit } from './estrategias/FirstFit';
import { RegistroInvalidoError } from '../errores/RegistroInvalidoError';
import { validarEnteroPositivo } from '../utilidades/validarEnteroPositivo';

// Coordina la simulación (RF01, RF03, RF06, RF10).
// No hace el trabajo de las partes: lo DELEGA. La memoria la maneja el
// GestorMemoria, la CPU el PlanificadorRoundRobin y cada Proceso cuida su
// propio estado. El simulador solo decide el ORDEN de las fases de cada tick.
// Composición: el simulador crea sus partes y estas viven mientras él viva.
export class Simulador implements ISimulador {
    readonly #memoria: IGestorMemoria;
    readonly #planificador: IPlanificador;
    // Map: conserva el orden de registro, que es el orden de admisión (RF03)
    readonly #procesos: Map<number, Proceso>;
    readonly #bloqueados: Proceso[];
    #tick: number;
    #ticksCpuOcupada: number;
    #metricas: Metricas;

    constructor({ memoriaTotal = 1024, quantum = 2, estrategia = new FirstFit() }: ConfiguracionSimulacion = {}) {
        // RF01: se valida TODO antes de crear cualquier parte, así una
        // configuración inválida no deja un simulador a medio construir
        validarEnteroPositivo('memoria total', memoriaTotal);
        validarEnteroPositivo('quantum', quantum);

        this.#memoria = new GestorMemoria(memoriaTotal, estrategia);
        this.#planificador = new PlanificadorRoundRobin(quantum);
        this.#procesos = new Map();
        this.#bloqueados = [];
        this.#tick = 0;
        this.#ticksCpuOcupada = 0;
        this.#metricas = new Metricas(this.#memoria, 0, 0, 0);
    }

    // ---------- Configuración y estado (RF10) ----------

    public get tick(): number {
        return this.#tick;
    }

    public get memoriaTotal(): number {
        return this.#memoria.memoriaTotal;
    }

    public get quantum(): number {
        return this.#planificador.quantum;
    }

    public get politica(): string {
        return this.#memoria.politica;
    }

    public get procesoEnCpu(): number | null {
        return this.#planificador.procesoEnCpu?.pid ?? null;
    }

    // Las colas se devuelven como listas NUEVAS de PIDs, en su orden
    public get colaListos(): readonly number[] {
        return this.#planificador.colaListos.map((proceso) => proceso.pid);
    }

    public get esperandoMemoria(): readonly number[] {
        return this.#pidsEnEstado(EstadoProceso.EsperandoMemoria);
    }

    public get bloqueados(): readonly number[] {
        return this.#bloqueados.map((proceso) => proceso.pid);
    }

    public get terminados(): readonly number[] {
        return this.#pidsEnEstado(EstadoProceso.Terminado);
    }

    public get mapaMemoria(): readonly BloqueMemoria[] {
        return this.#memoria.bloques;
    }

    // Métricas calculadas al final del último tick (RF09)
    public get metricas(): Metricas {
        return this.#metricas;
    }

    // ---------- Registro y consulta de procesos (RF02) ----------

    // Registra el proceso en estado Nuevo. NO se admite acá: la admisión
    // ocurre en la fase 1 del próximo tick (RF03, RF06)
    public registrarProceso(pid: number, memoriaRequerida: number, cpuTotal: number, eventoES?: EventoES): void {
        if (this.#procesos.has(pid)) {
            throw new RegistroInvalidoError(`ya existe un proceso con PID ${pid}`);
        }

        if (memoriaRequerida > this.#memoria.memoriaTotal) {
            throw new RegistroInvalidoError(
                `el proceso pide ${memoriaRequerida} KB y la memoria total es ${this.#memoria.memoriaTotal} KB`
            );
        }

        // Se arma el proceso completo ANTES de guardarlo: si algo es inválido
        // (datos o evento de E/S), lanza error y el simulador no cambia
        const proceso = new Proceso(pid, memoriaRequerida, cpuTotal);

        if (eventoES !== undefined) {
            proceso.programarES(eventoES);
        }

        this.#procesos.set(pid, proceso);
    }

    public consultarProceso(pid: number): VistaProceso {
        const proceso = this.#procesos.get(pid);

        if (proceso === undefined) {
            throw new RegistroInvalidoError(`no existe un proceso con PID ${pid}`);
        }

        return this.#vista(proceso);
    }

    public listarProcesos(): readonly VistaProceso[] {
        return [...this.#procesos.values()].map((proceso) => this.#vista(proceso));
    }

    // ---------- Avance de la simulación (RF06) ----------

    // Avanza EXACTAMENTE un tick, siempre en el mismo orden de fases.
    // Sin esperas reales, temporizadores, hilos ni aleatoriedad
    public avanzarTick(): void {
        this.#faseAdmision();
        this.#faseBloqueados();
        this.#faseCpu();
        this.#faseRelojYMetricas();
    }

    // Fase 1 (RF03): intenta dar memoria a Nuevos y Esperando Memoria, en orden
    // de registro. Si uno no entra, se sigue con el siguiente (no lo bloquea)
    #faseAdmision(): void {
        for (const proceso of this.#procesos.values()) {
            if (proceso.estado !== EstadoProceso.Nuevo && proceso.estado !== EstadoProceso.EsperandoMemoria) {
                continue;
            }

            if (this.#memoria.asignar(proceso.pid, proceso.memoriaRequerida)) {
                proceso.admitir();
                this.#planificador.encolar(proceso);
            } else if (proceso.estado === EstadoProceso.Nuevo) {
                proceso.esperarMemoria();
            }
        }
    }

    // Fase 2 (RF08): baja el temporizador de los bloqueados. Los que terminan
    // su E/S vuelven al FINAL de la cola de Listos (pueden ejecutarse en este tick)
    #faseBloqueados(): void {
        for (const proceso of [...this.#bloqueados]) {
            proceso.avanzarBloqueo();

            if (proceso.estado === EstadoProceso.Listo) {
                this.#bloqueados.splice(this.#bloqueados.indexOf(proceso), 1);
                this.#planificador.encolar(proceso);
            }
        }
    }

    // Fase 3 (RF07): Round Robin ejecuta una unidad de CPU. Según cómo quedó
    // el proceso: si terminó se libera su memoria (con coalescencia); si se
    // bloqueó, conserva la memoria y pasa a la lista de bloqueados
    #faseCpu(): void {
        const ejecutado = this.#planificador.ejecutarTick();

        if (ejecutado === null) {
            return;
        }

        this.#ticksCpuOcupada++;

        if (ejecutado.estado === EstadoProceso.Terminado) {
            this.#memoria.liberar(ejecutado.pid);
        } else if (ejecutado.estado === EstadoProceso.Bloqueado) {
            this.#bloqueados.push(ejecutado);
        }
    }

    // Fase 4 (RF06, RF09): avanza el reloj y recalcula las métricas
    #faseRelojYMetricas(): void {
        this.#tick++;
        this.#metricas = new Metricas(
            this.#memoria, this.#tick, this.#ticksCpuOcupada, this.#planificador.cambiosContexto
        );
    }

    // ---------- Finalización forzada (para la defensa) ----------

    // Termina un proceso en cualquier estado, sin esperar a que agote su CPU.
    // Lo saca de la CPU, de la cola o de bloqueados y, si tenía memoria, la
    // libera: así se puede provocar una coalescencia en vivo. Las métricas
    // se recalculan en el momento, sin avanzar el reloj
    public finalizarProceso(pid: number): void {
        const proceso = this.#procesos.get(pid);

        if (proceso === undefined) {
            throw new RegistroInvalidoError(`no existe un proceso con PID ${pid}`);
        }

        // Primero el cambio de estado: si ya estaba Terminado lanza error
        // y no se toca nada más
        proceso.finalizar();

        this.#planificador.retirar(proceso);

        const indiceBloqueado = this.#bloqueados.indexOf(proceso);

        if (indiceBloqueado !== -1) {
            this.#bloqueados.splice(indiceBloqueado, 1);
        }

        if (this.#memoria.tieneMemoria(pid)) {
            this.#memoria.liberar(pid);
        }

        this.#metricas = new Metricas(
            this.#memoria, this.#tick, this.#ticksCpuOcupada, this.#planificador.cambiosContexto
        );
    }

    // ---------- Ayudas privadas ----------

    #pidsEnEstado(estado: EstadoProceso): number[] {
        return [...this.#procesos.values()]
            .filter((proceso) => proceso.estado === estado)
            .map((proceso) => proceso.pid);
    }

    // Copia congelada con los datos del proceso: no expone sus métodos
    #vista(proceso: Proceso): VistaProceso {
        return Object.freeze({
            pid: proceso.pid,
            memoriaRequerida: proceso.memoriaRequerida,
            cpuTotal: proceso.cpuTotal,
            cpuRestante: proceso.cpuRestante,
            estado: proceso.estado,
            quantumConsumido: proceso.quantumConsumido,
            bloqueoRestante: proceso.bloqueoRestante,
        });
    }
}
