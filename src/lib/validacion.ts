export const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const RE_TELEFONO = /^\d{7,15}$/;
export const RE_DOCUMENTO = /^[A-Za-z0-9.\-]{4,20}$/;
export const MAX_HUESPEDES = 10;

export const errorNombre = (v: string) =>
  v.trim().length < 3 ? "Escribe el nombre completo (mínimo 3 letras)." : "";
// Teléfono y correo son opcionales; si se escriben, deben tener formato válido.
export const errorTelefono = (v: string) =>
  v.trim() && !RE_TELEFONO.test(v.trim()) ? "Solo números, entre 7 y 15 dígitos." : "";
export const errorCorreo = (v: string) =>
  v.trim() && !RE_CORREO.test(v.trim()) ? "Escribe un correo válido, como nombre@dominio.com." : "";
export const errorDocumento = (v: string) =>
  v.trim() && !RE_DOCUMENTO.test(v.trim())
    ? "Solo letras, números, puntos o guiones (4 a 20)."
    : "";
