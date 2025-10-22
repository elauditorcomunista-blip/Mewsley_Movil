/**
 * Knight Bot - A WhatsApp Bot
 * Copyright (c) 2024
 *
 * Este bot usa la librería Baileys para conectarse a WhatsApp.
 * Compatible con despliegue en Render y ejecución local.
 */

// ===============================
// 🟢 Servidor HTTP para Render
// ===============================
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 Knight Bot activo en Render\n');
}).listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Servidor ficticio activo en el puerto ${process.env.PORT || 3000}`);
});

// ===============================
// 📦 Dependencias principales
// ===============================
require('./settings');
const fs = require('fs');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal'); // QR visual
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const { smsg } = require('./lib/myfunc');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");

const store = require('./lib/lightweight_store');
store.readFromFile();
setInterval(() => store.writeToFile(), 10000);

// ===============================
// 📱 Datos base del bot
// ===============================
let phoneNumber = "5214778534828"; // Número internacional
let owner = JSON.parse(fs.readFileSync('./data/owner.json'));
global.botname = "KNIGHT BOT";
global.themeemoji = "•";

// ===============================
// 🚀 Función principal del bot
// ===============================
async function startXeonBotInc() {
    // Crear carpeta session si no existe
    if (!fs.existsSync('./session')) fs.mkdirSync('./session');

    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();
    const msgRetryCounterCache = new NodeCache();

    const XeonBotInc = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid);
            let msg = await store.loadMessage(jid, key.id);
            return msg?.message || "";
        },
        msgRetryCounterCache
    });

    store.bind(XeonBotInc.ev);

    // ===============================
    // 🔍 Mostrar QR escaneable en consola
    // ===============================
    XeonBotInc.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("\n📱 Escanea este código QR para vincular el bot con WhatsApp:\n");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "open") {
            console.log("✅ Bot conectado correctamente a WhatsApp");
        } else if (connection === "close") {
            console.log("❌ Conexión cerrada, intentando reconectar...");
            startXeonBotInc();
        }
    });

    // ===============================
    // 🧩 Comando !hola y otros mensajes
    // ===============================
    const comandoPrueba = require('./pluggins/comandoprueba.js');
    XeonBotInc.ev.on('messages.upsert', async m => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;

            let text = '';
            if (msg.message.conversation) text = msg.message.conversation;
            else if (msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
            else if (msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;

            text = text.trim().toLowerCase();

            if (text === (comandoPrueba.prefix + comandoPrueba.name).toLowerCase()) {
                await comandoPrueba.execute(XeonBotInc, msg);
            }

            await handleMessages(XeonBotInc, m, true);
        } catch (err) {
            console.error('Error procesando mensaje:', err);
        }
    });

    XeonBotInc.ev.on('group-participants.update', async (update) => await handleGroupParticipantUpdate(XeonBotInc, update));
    XeonBotInc.ev.on('creds.update', saveCreds);
    XeonBotInc.public = true;
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);

    return XeonBotInc;
}

// ===============================
// ▶️ Ejecutar bot
// ===============================
startXeonBotInc().catch(err => console.error('❌ Error fatal:', err));

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
