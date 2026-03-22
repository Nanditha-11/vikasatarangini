const dns = require("dns").promises;

async function resolveAtlas() {
  const hostname = "cluster0.mpdakyx.mongodb.net";
  try {
    console.log(`Resolving SRV for: _mongodb._tcp.${hostname}`);
    const addresses = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
    console.log("Found Shards:");
    addresses.forEach(addr => {
      console.log(`- ${addr.name}:${addr.port}`);
    });
    
    const hosts = addresses.map(a => `${a.name}:${a.port}`).join(",");
    const user = "yathipathisd";
    const pass = "Pandu%400105";
    const db = "vikasatarangini";
    
    // Construct standard connection string
    const standardUri = `mongodb://${user}:${pass}@${hosts}/${db}?ssl=true&replicaSet=atlas-7p62t6-shard-0&authSource=admin&retryWrites=true&w=majority`;
    console.log("\nConstructed Standard URI:");
    console.log(standardUri);
    
  } catch (err) {
    console.error("Failed to resolve:", err.message);
  }
}

resolveAtlas();
