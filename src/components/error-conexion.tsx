"use client";

// La llamada al servidor falló (conexión, o la app se actualizó con esta página abierta):
// no se sabe si el cambio alcanzó a guardarse. Quien lo usa bloquea el reenvío para no duplicarlo.
export function ErrorConexion({ que }: { que: string }) {
  return (
    <div className="alert" role="alert">
      No se pudo confirmar si {que}. Recarga la página y revisa antes de intentarlo de nuevo.
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => window.location.reload()}>
          Recargar página
        </button>
      </div>
    </div>
  );
}
