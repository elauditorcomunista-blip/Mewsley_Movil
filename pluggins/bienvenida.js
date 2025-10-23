// 📂 pluggins/bienvenida.js
module.exports = (conn) => {
  conn.ev.on('group-participants.update', async (update) => {
    try {
      if (update.action === 'add') {
        for (const user of update.participants) {
          const nombreGrupo = update.subject || 'el grupo';
          const numero = user.id ? user.id.split('@')[0] : user.split('@')[0];
          const texto = `👋 ¡Bienvenido/a @${numero} a *${nombreGrupo}*! 🌟\nDisfruta del grupo y respeta las reglas.`;

          await conn.sendMessage(update.id, {
            text: texto,
            mentions: [user.id || user],
          });
        }
      }
    } catch (error) {
      console.error('Error en bienvenida:', error);
    }
  });
};
