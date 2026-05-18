const fs = require('fs');
const path = require('path');

const targetFiles = [
  'c:/Users/nandi/Documents/pls edit/final0/server/src/lib/whatsappService.js',
  'c:/Users/nandi/Documents/pls edit/final0_test/server/src/lib/whatsappService.js'
];

targetFiles.forEach(servicePath => {
  if (fs.existsSync(servicePath)) {
    let content = fs.readFileSync(servicePath, 'utf8');

    const targetFunc = `async function sendWhatsAppMessage(phone, text) {
  if (!isReady || !sock) {
    throw new Error('WhatsApp client is not ready. Please link your device first.');
  }

  // Clean phone number
  let cleanPhone = phone.replace(/\\D/g, '');
  if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  
  const jid = \`\${cleanPhone}@s.whatsapp.net\`;
  
  console.log(\`[WhatsApp] Sending message to \${jid}...\`);
  await sock.sendMessage(jid, { text });
  return { success: true };
}`;

    const replacementFunc = `async function sendWhatsAppMessage(phone, text) {
  if (!isReady || !sock) {
    throw new Error('WhatsApp client is not ready. Please link your device first.');
  }

  // Clean phone number
  let cleanPhone = phone.replace(/\\D/g, '');
  if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  
  const jid = \`\${cleanPhone}@s.whatsapp.net\`;

  // Check if message text contains a QuickChart QR URL
  const qrMatch = text.match(/(https:\\/\\/quickchart\\.io\\/qr\\S+)/);
  if (qrMatch) {
    const imageUrl = qrMatch[1];
    
    // Extract the clean text message to use as the photo caption
    let cleanText = text.replace(imageUrl, '').trim();
    
    // Strip redundant "save or screenshot" sentences since they receive the photo directly!
    cleanText = cleanText.replace(/📷\\s*Your Attendance QR Code\\s*\\/\\s*మీ అటెండెన్స్ QR కోడ్:?/gi, '').trim();
    cleanText = cleanText.replace(/Please save or screenshot this QR code\\. Show it when you arrive for faster attendance!/gi, '').trim();
    cleanText = cleanText.replace(/దయచేసి ఈ QR కోడ్‌ను సేవ్ లేదా స్క్రీన్‌షాట్ తీసుకోండి\\. హాజరు త్వరగా నమోదు కావడానికి మీరు వచ్చినప్పుడు దీనిని చూపించండి!?/gi, '').trim();
    cleanText = cleanText.trim();

    console.log(\`[WhatsApp] Sending QR code as DIRECT PHOTO to \${jid}...\`);
    await sock.sendMessage(jid, { 
      image: { url: imageUrl }, 
      caption: cleanText 
    });
    return { success: true };
  }
  
  console.log(\`[WhatsApp] Sending standard text message to \${jid}...\`);
  await sock.sendMessage(jid, { text });
  return { success: true };
}`;

    // Try both standard newlines and raw replace in case of indent deviations
    if (content.includes(targetFunc)) {
      content = content.replace(targetFunc, replacementFunc);
      fs.writeFileSync(servicePath, content, 'utf8');
      console.log(`SUCCESS: Patched QR photo media delivery in ${path.basename(path.dirname(path.dirname(servicePath)))}`);
    } else {
      // Fallback: search-and-replace the inner block of sendWhatsAppMessage
      const simpleTarget = `  console.log(\`[WhatsApp] Sending message to \${jid}...\`);
  await sock.sendMessage(jid, { text });
  return { success: true };`;

      const simpleReplacement = `  // Check if message text contains a QuickChart QR URL
  const qrMatch = text.match(/(https:\\/\\/quickchart\\.io\\/qr\\S+)/);
  if (qrMatch) {
    const imageUrl = qrMatch[1];
    
    // Extract the clean text message to use as the photo caption
    let cleanText = text.replace(imageUrl, '').trim();
    
    // Strip redundant "save or screenshot" sentences since they receive the photo directly!
    cleanText = cleanText.replace(/📷\\s*Your Attendance QR Code\\s*\\/\\s*మీ అటెండెన్స్ QR కోడ్:?/gi, '').trim();
    cleanText = cleanText.replace(/Please save or screenshot this QR code\\. Show it when you arrive for faster attendance!/gi, '').trim();
    cleanText = cleanText.replace(/దయచేసి ఈ QR కోడ్‌ను సేవ్ లేదా స్క్రీన్‌షాట్ తీసుకోండి\\. హాజరు త్వరగా నమోదు కావడానికి మీరు వచ్చినప్పుడు దీనిని చూపించండి!?/gi, '').trim();
    cleanText = cleanText.trim();

    console.log(\`[WhatsApp] Sending QR code as DIRECT PHOTO to \${jid}...\`);
    await sock.sendMessage(jid, { 
      image: { url: imageUrl }, 
      caption: cleanText 
    });
    return { success: true };
  }

  console.log(\`[WhatsApp] Sending standard text message to \${jid}...\`);
  await sock.sendMessage(jid, { text });
  return { success: true };`;

      if (content.includes(simpleTarget)) {
        content = content.replace(simpleTarget, simpleReplacement);
        fs.writeFileSync(servicePath, content, 'utf8');
        console.log(`SUCCESS: Fallback patched QR photo media delivery in ${path.basename(path.dirname(path.dirname(servicePath)))}`);
      } else {
        console.log(`WARNING: Could not apply patch to ${servicePath}`);
      }
    }
  }
});
