// 📂 plugins/bienvenida.js
const handler = async (m, { conn }) => {};

// Escucha eventos del grupo
handler.before = async (m, { conn, participants }) => {
  if (!m.isGroup) return;

  for (const user of m.action === 'add' ? m.participants : []) {
    if (m.action === 'add') {
      const texto = `👋 ¡Bienvenido/a @${user.split('@')[0]} al grupo *${m.chatName || ''}*! 🌟\nDisfruta del grupo y respeta las reglas.`
      conn.sendMessage(m.chat, { text: texto, mentions: [user] });
    }
  }
};

export default handler;
