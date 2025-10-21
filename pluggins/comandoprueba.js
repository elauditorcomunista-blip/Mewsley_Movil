module.exports = {
    name: 'hola',
    prefix: '!',
    async execute(sock, message) { // sock viene desde index.js
        try {
            const sender = message.key.remoteJid;
            const botName = 'Knight Bot';
            const response = `Hola! Soy ${botName} 🤖\nEstoy activo y listo para ayudarte!`;
            await sock.sendMessage(sender, { text: response });
        } catch (err) {
            console.error('Error al ejecutar comando !hola:', err);
        }
    }
};
