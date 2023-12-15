import crypto from 'crypto';
import 'dotenv/config';


const config = {
    encryptionKey: process.env.ENCRYPTION_KEY && Buffer.from(process.env.ENCRYPTION_KEY, 'base64') || crypto.randomBytes(32),
    rikiAPI: process.env.RIKI_SERVICE_ENDPOINT,
    trustedIssuers: [{
        name: "sophtron",
        did: "did:ion:EiDPbz2t9aw5u8GRCRyyY090Gk3vSHmsZFLYgVnBurOMEw"
    }],
}

export default config;