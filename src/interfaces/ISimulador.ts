import { BloqueMemoria } from '../modelos/BloqueMemoria';
import { EventoES } from '../modelos/EventoES';
import { Metricas } from '../modelos/Metricas';
import { VistaProceso } from './VistaProceso';

// Contrato del simulador: lo único que usan los tests para armar escenarios
export interface ISimulador {
    // Consultas del estado del sistema (RF10)
    readonly tick: number;
    readonly memoriaTotal: number;
    readonly quantum: number;
    readonly politica: string;
    readonly procesoEnCpu: number | null;
    readonly colaListos: readonly number[];
    readonly esperandoMemoria: readonly number[];
    readonly bloqueados: readonly number[];
    readonly terminados: readonly number[];
    readonly mapaMemoria: readonly BloqueMemoria[];
    readonly metricas: Metricas;

    registrarProceso(pid: number, memoriaRequerida: number, cpuTotal: number, eventoES?: EventoES): void;
    consultarProceso(pid: number): VistaProceso;
    listarProcesos(): readonly VistaProceso[];
    avanzarTick(): void;
}
