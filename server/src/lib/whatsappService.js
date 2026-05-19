const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// Multi-tenant instances map
// Keys are tenantId (admin.username)
// Values are: { sock, isReady, latestQr, connectionStatus, qrGenerationTime, lastError, authFolder }
const instances = {};

function getOrCreateInstance(tenantId) {
  const cleanId = String(tenantId || 'global').trim();
  if (!instances[cleanId]) {
    instances[cleanId] = {
      sock: null,
      isReady: false,
      latestQr: null,
      connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected'
      qrGenerationTime: null,
      lastError: null,
      authFolder: path.join(__dirname, `../../.baileys-auth-${cleanId}`)
    };
  }
  return instances[cleanId];
}

async function initWhatsApp(tenantId = 'global') {
  const inst = getOrCreateInstance(tenantId);
  console.log(`[WhatsApp] Initializing WhatsApp Client for tenant: ${tenantId}...`);
  inst.connectionStatus = 'connecting';
  
  // Ensure the auth folder exists and has write permissions
  try {
    if (!fs.existsSync(inst.authFolder)) {
      fs.mkdirSync(inst.authFolder, { recursive: true });
      console.log(`[WhatsApp] Created auth directory at: ${inst.authFolder}`);
    }
    // Test write permission by writing a temp file
    const tempFile = path.join(inst.authFolder, '.write-test');
    fs.writeFileSync(tempFile, 'test');
    fs.unlinkSync(tempFile);
    console.log(`[WhatsApp] Auth directory write test successful for ${tenantId}.`);
  } catch (err) {
    console.error(`[WhatsApp] Auth directory validation failed for ${tenantId}:`, err);
    inst.lastError = {
      stage: 'auth_directory_validation',
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    };
  }

  // Fetch the latest WA Web version to avoid connection failures
  let version = [2, 3000, 1015901307]; // fallback version
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
    console.log(`[WhatsApp] Using dynamically fetched WA Web version: ${version.join('.')} for ${tenantId}`);
  } catch (err) {
    console.warn(`[WhatsApp] Failed to fetch latest WA Web version for ${tenantId}, using fallback:`, err);
    inst.lastError = {
      stage: 'fetch_baileys_version',
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    };
  }

  const { state, saveCreds } = await useMultiFileAuthState(inst.authFolder);
  
  inst.sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  inst.sock.ev.on('creds.update', saveCreds);

  inst.sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      if (!inst.qrGenerationTime) {
        inst.qrGenerationTime = Date.now();
      }
      inst.latestQr = qr;
      inst.connectionStatus = 'disconnected';
      console.log(`[WhatsApp] New QR code generated for ${tenantId}. Scan to link device.`);
      qrcode.generate(qr, { small: true });
    }

    if (lastDisconnect && lastDisconnect.error) {
      inst.lastError = {
        stage: 'connection_update_error',
        message: lastDisconnect.error.message,
        stack: lastDisconnect.error.stack,
        statusCode: lastDisconnect.error.output?.statusCode,
        timestamp: new Date().toISOString()
      };
      console.error(`[WhatsApp] Connection error for ${tenantId}:`, lastDisconnect.error);
    }

    if (connection === 'close') {
      inst.isReady = false;
      inst.latestQr = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Connection closed for ${tenantId}. Reason:`, lastDisconnect?.error, 'Reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        const expired = inst.qrGenerationTime && (Date.now() - inst.qrGenerationTime > 12 * 60 * 60 * 1000);
        if (expired) {
          console.log(`[WhatsApp] Reconnect bypassed for ${tenantId}: Pairing session expired.`);
          inst.connectionStatus = 'disconnected';
        } else {
          initWhatsApp(tenantId);
        }
      } else {
        inst.qrGenerationTime = null;
        inst.connectionStatus = 'disconnected';
        try {
          fs.rmSync(inst.authFolder, { recursive: true, force: true });
        } catch (e) {
          console.error(`[WhatsApp] Failed to clear auth folder for ${tenantId}:`, e);
        }
        console.log(`[WhatsApp] Logged out for ${tenantId}. Auth state cleared.`);
      }
    } else if (connection === 'open') {
      inst.isReady = true;
      inst.latestQr = null;
      inst.qrGenerationTime = null;
      inst.connectionStatus = 'connected';
      console.log(`[WhatsApp] Client ${tenantId} is READY and CONNECTED!`);
    }
  });
}

async function sendWhatsAppMessage(tenantId, phone, text) {
  const cleanId = String(tenantId || 'global').trim();
  const inst = getOrCreateInstance(cleanId);
  
  if (!inst.sock && inst.connectionStatus === 'disconnected') {
    await initWhatsApp(cleanId);
  }

  if (!inst.isReady || !inst.sock) {
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

    console.log(`[WhatsApp] Sending QR code as DIRECT PHOTO to ${jid} via tenant ${cleanId}...`);
    try {
      await inst.sock.sendMessage(jid, { 
        image: { url: imageUrl }, 
        caption: cleanText 
      });
      return { success: true };
    } catch (sendImageError) {
      console.error(`[WhatsApp] Direct photo message failed via ${cleanId}. Falling back to plain text message:`, sendImageError);
      // Fallback: Send the original full text containing the QR link
      await inst.sock.sendMessage(jid, { text });
      return { success: true, warning: 'Failed to send image, fallback to text successful' };
    }
  }
  
  console.log(`[WhatsApp] Sending standard text message to ${jid} via tenant ${cleanId}...`);
  await inst.sock.sendMessage(jid, { text });
  return { success: true };
}

async function logoutWhatsApp(tenantId = 'global') {
  const cleanId = String(tenantId || 'global').trim();
  const inst = getOrCreateInstance(cleanId);
  if (inst.sock) {
    try {
      await inst.sock.logout();
    } catch (e) {
      console.error(`[WhatsApp] Sock logout failed for ${cleanId}:`, e);
    }
  }
  inst.isReady = false;
  inst.latestQr = null;
  inst.qrGenerationTime = null;
  inst.connectionStatus = 'disconnected';
  try {
    fs.rmSync(inst.authFolder, { recursive: true, force: true });
  } catch (e) {
    console.error(`[WhatsApp] Failed to clear auth folder on logout for ${cleanId}:`, e);
  }
  await initWhatsApp(cleanId);
}

function getStatus(tenantId = 'global') {
  const cleanId = String(tenantId || 'global').trim();
  const inst = getOrCreateInstance(cleanId);
  const expired = inst.qrGenerationTime && (Date.now() - inst.qrGenerationTime > 12 * 60 * 60 * 1000);
  if (expired && inst.connectionStatus !== 'connected') {
    if (inst.sock && inst.connectionStatus !== 'expired') {
      console.log(`[WhatsApp] QR pairing code expired for ${cleanId} after 12 hours.`);
      try {
        inst.sock.end();
      } catch (e) {}
    }
    return {
      status: 'expired',
      qr: null,
      phone: null
    };
  }

  let botPhone = null;
  if (inst.sock && inst.sock.user && inst.sock.user.id) {
    botPhone = inst.sock.user.id.split(':')[0].split('@')[0];
  }

  let status = inst.connectionStatus;
  if (status === 'connected' && (!inst.isReady || !botPhone)) {
    status = 'disconnected';
  }

  return {
    status,
    qr: inst.latestQr,
    phone: botPhone
  };
}

function getDiagnose(tenantId = 'global') {
  const cleanId = String(tenantId || 'global').trim();
  const inst = getOrCreateInstance(cleanId);
  return {
    connectionStatus: inst.connectionStatus,
    isReady: inst.isReady,
    hasSocket: !!inst.sock,
    hasLatestQr: !!inst.latestQr,
    qrGenerationTime: inst.qrGenerationTime ? new Date(inst.qrGenerationTime).toISOString() : null,
    authFolder: inst.authFolder,
    authFolderExists: fs.existsSync(inst.authFolder),
    lastError: inst.lastError,
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV
  };
}

module.exports = {
  initWhatsApp,
  sendWhatsAppMessage,
  getStatus,
  logoutWhatsApp,
  getDiagnose
};
