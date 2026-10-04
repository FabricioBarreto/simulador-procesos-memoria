import { EstadoProceso } from '../modelos/EstadoProceso';

// Vista de SOLO LECTURA de un proceso (RF02, RF10).
// El simulador nunca entrega el objeto Proceso real: si lo hiciera, desde
// afuera se podría llamar a despachar() o admitir() y saltear las reglas.
export interface VistaProceso {
    readonly pid: number;
    readonly memoriaRequerida: number;
    readonly cpuTotal: number;
    readonly cpuRestante: number;
    readonly estado: EstadoProceso;
    readonly quantumConsumido: number;
    readonly bloqueoRestante: number;
}
