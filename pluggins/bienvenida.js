const bienvenida = async (XeonBotInc) => {
  XeonBotInc.ev.on('group-participants.update', async (update) => {
    try {
      const { id, participants, action } = update; // id = grupo, participants = array de usuarios, action = 'add', 'remove', etc.
      if (action === 'add') {
        for (const user of participants) {
          const texto = `👋 ¡Bienvenido/a @${user.split('@')[0]} al grupo! 🌟\nDisfruta del grupo y respeta las reglas.`;
          await XeonBotInc.sendMessage(id, { text: texto, mentions: [user] });
        }
      }
    } catch (err) {
      console.error('Error en bienvenida:', err);
    }
  });
};

module.exports = bienvenida;
