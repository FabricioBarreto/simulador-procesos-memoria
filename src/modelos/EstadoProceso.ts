// Los seis estados del ciclo de vida de un proceso (RF03).
// Se usan valores de texto para que los mensajes y los tests sean legibles.
export enum EstadoProceso {
    Nuevo = 'NUEVO',
    EsperandoMemoria = 'ESPERANDO_MEMORIA',
    Listo = 'LISTO',
    Ejecutando = 'EJECUTANDO',
    Bloqueado = 'BLOQUEADO',
    Terminado = 'TERMINADO',
}
