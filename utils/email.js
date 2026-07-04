const nodemailer = require("nodemailer");
const pool = require("../config/database");

const crearTransport = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const obtenerJugadoresDelTorneo = async (torneoId) => {
  const result = await pool.query(
    `SELECT u.email, u.nombre
     FROM usuarios u
     JOIN usuarios_torneos ut ON ut.usuario_id = u.id
     WHERE ut.torneo_id = $1 AND u.rol = 'jugador' AND u.activo = true
     ORDER BY u.nombre`,
    [torneoId]
  );
  return result.rows;
};

const enviarNotificacionJornada = async (torneoId, accion, jornadaNumero, fechaCierre = null) => {
  const transport = crearTransport();
  if (!transport) return;

  try {
    const [jugadores, torneoResult] = await Promise.all([
      obtenerJugadoresDelTorneo(torneoId),
      pool.query(`SELECT nombre FROM torneos WHERE id = $1`, [torneoId]),
    ]);

    if (jugadores.length === 0) return;

    const torneoNombre = torneoResult.rows[0]?.nombre ?? "Quiniela";
    const emails = jugadores.map((j) => j.email);

    const abierta = accion === "abierta";
    const fechaStr = fechaCierre
      ? new Date(fechaCierre).toLocaleString("es-MX", {
          timeZone: "America/Mexico_City",
          dateStyle: "full",
          timeStyle: "short",
        })
      : null;

    const asunto = abierta
      ? `⚽ Jornada ${jornadaNumero} abierta — ${torneoNombre}`
      : `🔒 Jornada ${jornadaNumero} cerrada — ${torneoNombre}`;

    const cuerpo = abierta
      ? `Hola,\n\nLa Jornada ${jornadaNumero} de ${torneoNombre} ya está abierta.${
          fechaStr ? `\n\nTienes hasta el ${fechaStr} para registrar tus pronósticos.` : ""
        }\n\nBuena suerte!\n`
      : `Hola,\n\nLa Jornada ${jornadaNumero} de ${torneoNombre} ha sido cerrada.\nYa no es posible modificar pronósticos.\n`;

    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      bcc: emails,
      subject: asunto,
      text: cuerpo,
    });

    console.log(`Notificación jornada ${jornadaNumero} (${accion}) enviada a ${emails.length} jugadores`);
  } catch (err) {
    console.error("Error enviando notificaciones de jornada:", err.message);
  }
};

module.exports = { enviarNotificacionJornada };
