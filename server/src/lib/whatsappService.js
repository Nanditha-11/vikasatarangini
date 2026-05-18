const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

let sock = null;
let isReady = false;
let latestQr = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected'
let qrGenerationTime = null;

const authFolder = path.join(__dirname, '../../.baileys-auth');

async function initWhatsApp() {
  console.log('[WhatsApp] Initializing WhatsApp Client...');
  connectionStatus = 'connecting';
  
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      if (!qrGenerationTime) {
        qrGenerationTime = Date.now();
      }
      latestQr = qr;
      connectionStatus = 'disconnected';
      console.log('[WhatsApp] New QR code generated. Scan to link device.');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      isReady = false;
      latestQr = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[WhatsApp] Connection closed. Reason:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        const expired = qrGenerationTime && (Date.now() - qrGenerationTime > 12 * 60 * 60 * 1000);
        if (expired) {
          console.log('[WhatsApp] Reconnect bypassed: Pairing session expired.');
          connectionStatus = 'disconnected';
        } else {
          initWhatsApp();
        }
      } else {
        qrGenerationTime = null;
        connectionStatus = 'disconnected';
        try {
          fs.rmSync(authFolder, { recursive: true, force: true });
        } catch (e) {
          console.error('[WhatsApp] Failed to clear auth folder:', e);
        }
        console.log('[WhatsApp] Logged out. Auth state cleared.');
      }
    } else if (connection === 'open') {
      isReady = true;
      latestQr = null;
      qrGenerationTime = null;
      connectionStatus = 'connected';
      console.log('[WhatsApp] Client is READY and CONNECTED!');
    }
  });
}

async function sendWhatsAppMessage(phone, text) {
  if (!isReady || !sock) {
    throw new Error('WhatsApp client is not ready. Please link your device first.');
  }

  // Clean phone number
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  
  const jid = `${cleanPhone}@s.whatsapp.net`;

  // Check if message text contains a QuickChart QR URL
  const qrMatch = text.match(/(https:\/\/quickchart\.io\/qr\S+)/);
  if (qrMatch) {
    const imageUrl = qrMatch[1];
    
    // Extract the clean text message to use as the photo caption
    let cleanText = text.replace(imageUrl, '').trim();
    
    // Strip redundant "save or screenshot" sentences since they receive the photo directly!
    cleanText = cleanText.replace(/📷\s*Your Attendance QR Code\s*\/\s*మీ అటెండెన్స్ QR కోడ్:?/gi, '').trim();
    cleanText = cleanText.replace(/Please save or screenshot this QR code\. Show it when you arrive for faster attendance!/gi, '').trim();
    cleanText = cleanText.replace(/దయచేసి ఈ QR కోడ్‌ను సేవ్ లేదా స్క్రీన్‌షాట్ తీసుకోండి\. హాజరు త్వరగా నమోదు కావడానికి మీరు వచ్చినప్పుడు దీనిని చూపించండి!?/gi, '').trim();
    cleanText = cleanText.trim();

    console.log(`[WhatsApp] Sending QR code as DIRECT PHOTO to ${jid}...`);
    await sock.sendMessage(jid, { 
      image: { url: imageUrl }, 
      caption: cleanText 
    });
    return { success: true };
  }
  
  console.log(`[WhatsApp] Sending standard text message to ${jid}...`);
  await sock.sendMessage(jid, { text });
  return { success: true };
}

async function logoutWhatsApp() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      console.error('[WhatsApp] Sock logout failed:', e);
    }
  }
  isReady = false;
  latestQr = null;
  qrGenerationTime = null;
  connectionStatus = 'disconnected';
  try {
    fs.rmSync(authFolder, { recursive: true, force: true });
  } catch (e) {
    console.error('[WhatsApp] Failed to clear auth folder on logout:', e);
  }
  initWhatsApp();
}

function getStatus() {
  const expired = qrGenerationTime && (Date.now() - qrGenerationTime > 12 * 60 * 60 * 1000);
  if (expired && connectionStatus !== 'connected') {
    if (sock && connectionStatus !== 'expired') {
      console.log('[WhatsApp] QR pairing code expired after 12 hours.');
      try {
        sock.end();
      } catch (e) {}
    }
    return {
      status: 'expired',
      qr: null
    };
  }
  return {
    status: connectionStatus,
    qr: latestQr
  };
}

module.exports = {
  initWhatsApp,
  sendWhatsAppMessage,
  getStatus,
  logoutWhatsApp
};
