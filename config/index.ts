import crypto from 'crypto';
import 'dotenv/config';

const environment =
    process.env.ENVIRONMENT || "development"; // development, production 

let scheme = "https";
const externalHostname = process.env.EXTERNAL_HOSTNAME || "localhost";
const externalPort = parseInt(`${process.env.EXTERNAL_PORT}`) || 3001;

let externalUrl = `${scheme}://${externalHostname}`;

if (externalPort !== 443) {
    scheme = "http";
    externalUrl = `${scheme}://${externalHostname}:${externalPort}`;
}

let port = Number(process.env.PORT) || 3001;

const config = {
    dwnServiceEndpoints: process.env.DWN_ENDPOINTS ? process.env.DWN_ENDPOINTS.split(',') : ['http://localhost:' + port],
    encryptionKey: process.env.ENCRYPTION_KEY && Buffer.from(process.env.ENCRYPTION_KEY, 'base64') || crypto.randomBytes(32),
    environment,
    externalHostname,
    externalUrl,
    levelDbDir: process.env.LEVELDB_DIR || "./DATA",
    port,
    rikiAPI: process.env.RIKI_SERVICE_ENDPOINT,
    trustedIssuers: [{
        name: "sophtron",
        did: "did:ion:EiDPbz2t9aw5u8GRCRyyY090Gk3vSHmsZFLYgVnBurOMEw"
    }],
    web5Configfile: process.env.WEB5_CONFIG_FILE || "./web5-config.json",
}

export default config;