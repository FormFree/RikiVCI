import crypto from 'crypto';
import config from "../config/index.js"

export function encrypt(message: string) {
    const algorithm = "aes-256-cbc";
    const initVector = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, config.encryptionKey, initVector);
    let encryptedBuff = cipher.update(message);
    encryptedBuff = Buffer.concat([encryptedBuff, cipher.final()]);

    const encrypted = initVector.toString('base64') + ':' + encryptedBuff.toString('base64');

    return encrypted;
}

export function decrypt(encrypted: string) {
    const textParts = encrypted.split(':');
    const iv = Buffer.from(textParts[0], 'base64');

    const decipher = crypto.createDecipheriv('aes-256-cbc', config.encryptionKey, iv);

    let decrypted = decipher.update(Buffer.from(textParts[1], 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
}