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
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const FileType = require('file-type');
const path = require('path');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif');
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidDecode,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");
const readline = require("readline");

const store = require('./lib/lightweight_store');
store.readFromFile();

const settings = require('./settings');
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

// 🧹 Mantenimiento de memoria
setInterval(() => {
  if (global.gc) global.gc();
}, 60_000);

setInterval(() => {
  const used = process.memoryUsage().rss / 1024 / 1024;
  if (used > 400) {
    console.log('⚠️ RAM demasiado alta, reiniciando...');
    process.exit(1);
  }
}, 30_000);

// ===============================
// 📱 Datos base del bot
// ===============================
let phoneNumber = "5214778534828"; // Tu número con formato internacional
let owner = JSON.parse(fs.readFileSync('./data/owner.json'));

global.botname = "KNIGHT BOT";
global.themeemoji = "•";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");

// ===============================
// 🚀 Función principal del bot
// ===============================
async function startXeonBotInc() {
  let { version } = await fetchLatestBaileysVersion();

  // =====================================================
  // 🧩 Crear carpeta de sesión si no existe
  // =====================================================
  if (!fs.existsSync('./session')) fs.mkdirSync('./session');

  // =====================================================
  // 🧩 Restaurar sesión desde variable de entorno (Render Free)
  // =====================================================
  if (process.env.SESSION_DATA) {
    try {
      console.log('🔁 Restaurando sesión desde variable de entorno...');
      const decoded = Buffer.from(process.env.SESSION_DATA, 'base64').toString('utf-8');
      fs.writeFileSync('./session/creds.json', decoded);
    } catch (err) {
      console.error('⚠️ Error al restaurar la sesión:', err);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(`./session`);
  const msgRetryCounterCache = new NodeCache();

  const XeonBotInc = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
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
    msgRetryCounterCache,
    defaultQueryTimeoutMs: undefined,
  });

  // ===============================
  // 🔍 Mostrar QR escaneable
  // ===============================
  XeonBotInc.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log("\n📱 Escanea este código QR para vincular el bot con WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ Bot conectado correctamente a WhatsApp");

      // 💾 Guardar la sesión codificada para Render
      try {
        const sessionData = fs.readFileSync("./session/creds.json", "utf-8");
        const encoded = Buffer.from(sessionData).toString("base64");
        console.log("\n💾 Copia este texto y pégalo como variable de entorno SESSION_DATA en Render:\n");
        console.log(encoded);
      } catch (err) {
        console.error("⚠️ No se pudo generar SESSION_DATA:", err);
      }
    } else if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      if (shouldReconnect) {
        console.log("🔄 Reconectando a WhatsApp...");
        setTimeout(() => startXeonBotInc(), 5000);
      } else {
        console.log("🧹 Sesión inválida. Eliminando carpeta session...");
        fs.rmSync('./session', { recursive: true, force: true });
        console.log("🔁 Reinicia el bot para generar un nuevo código QR.");
        process.exit(1);
      }
    }
  });

  // ===============================
  // 📩 Eventos principales
  // ===============================
  store.bind(XeonBotInc.ev);

  const comandoPrueba = require('./pluggins/comandoprueba.js');
  XeonBotInc.ev.on('messages.upsert', async m => {
    try {
      const msg = m.messages[0];
      if (!msg.message) return;

      let text = '';
      if (msg.message.conversation) text = msg.message.conversation;
      else if (msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
      else if (msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;

      text = text.trim();

      if (text.startsWith(comandoPrueba.prefix + comandoPrueba.name)) {
        await comandoPrueba.execute(XeonBotInc, msg);
      }
    } catch (err) {
      console.error('Error en comandoPrueba:', err);
    }
  });

  const bienvenida = require('./pluggins/bienvenida.js');
  bienvenida(XeonBotInc);

  // =====================================================
  // 💾 Guardado de sesión en variable de entorno (modo gratuito)
  // =====================================================
  XeonBotInc.ev.on('creds.update', async () => {
    try {
      await saveCreds();
      const credsData = fs.readFileSync('./session/creds.json', 'utf-8');
      process.env.SESSION_DATA = Buffer.from(credsData).toString('base64');
      console.log('✅ Sesión actualizada y almacenada temporalmente (Render Free)');
    } catch (err) {
      console.error('❌ Error al guardar sesión en variable de entorno:', err);
    }
  });

  XeonBotInc.ev.on('group-participants.update', async (update) => {
    await handleGroupParticipantUpdate(XeonBotInc, update);
  });

  XeonBotInc.public = true;
  XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);

  return XeonBotInc;
}

// ===============================
// ▶️ Ejecutar bot
// ===============================
startXeonBotInc().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
