// ===============================
// ▶️ Función principal del bot
// ===============================
async function startXeonBotInc() {
    let { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    const msgRetryCounterCache = new NodeCache();

    const XeonBotInc = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // ✅ No generar QR automáticamente
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid);
            let msg = await store.loadMessage(jid, key.id);
            return msg?.message || "";
        },
        msgRetryCounterCache,
    });

    // ⚡ Mostrar QR solo si no hay credenciales guardadas
    XeonBotInc.ev.on("connection.update", (update) => {
        const { connection, qr } = update;
        if (qr && !state.creds?.me) {
            console.log("\n📱 Escanea este código QR para vincular el bot con WhatsApp:\n");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "open") console.log("✅ Bot conectado correctamente a WhatsApp");
        else if (connection === "close") {
            console.log("❌ Conexión cerrada, reconectando en 5s...");
            setTimeout(startXeonBotInc, 5000);
        }
    });

    // 📩 Eventos principales
    store.bind(XeonBotInc.ev);

    XeonBotInc.ev.on('messages.upsert', async m => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;

            let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
            text = text.trim().toLowerCase();

            const comandoPrueba = require('./pluggins/comandoprueba.js');
            if (text === (comandoPrueba.prefix + comandoPrueba.name).toLowerCase()) {
                await comandoPrueba.execute(XeonBotInc, msg);
            }
        } catch (err) {
            console.error('Error en messages.upsert:', err);
        }
    });

    // 👋 Bienvenida a nuevos miembros
    const bienvenida = require('./pluggins/bienvenida.js');
    XeonBotInc.ev.on('group-participants.update', async (update) => {
        try {
            await bienvenida({ conn: XeonBotInc, ...update });
        } catch (err) {
            console.error('Error en bienvenida:', err);
        }
    });

    // ⚙ Otros eventos
    XeonBotInc.ev.on('creds.update', saveCreds);

    XeonBotInc.public = true;
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);

    return XeonBotInc;
}
