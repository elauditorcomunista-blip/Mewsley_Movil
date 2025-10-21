// 📂 plugins/eliminar.js
let handler = async (m, { conn, text, isAdmin, isBotAdmin }) => {
  if (!isAdmin) return m.reply('❌ Solo los administradores pueden usar este comando.');
  if (!isBotAdmin) return m.reply('⚠️ Necesito ser administrador para poder eliminar usuarios.');
  
  let usuario = m.mentionedJid[0] || (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false);
  if (!usuario) return m.reply('📎 Menciona o escribe el número del usuario que deseas eliminar.');

  await conn.groupParticipantsUpdate(m.chat, [usuario], 'remove');
  m.reply(`✅ Usuario eliminado correctamente.`);
};
handler.help = ['expulsar @usuario'];
handler.tags = ['group'];
handler.command = /^(expulsar|kick)$/i;

export default handler;
