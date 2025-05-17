const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ALGORITHM = 'aes-256-ctr';
const KEY_LENGTH = 32; // 32 bytes for AES-256
const IV_LENGTH = 16; // 16 bytes for AES-CTR
const SALT_LENGTH = 16; // For PBKDF2

// Improved key derivation with random salt
async function deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(
            password,
            salt,
            KEY_LENGTH,
            { N: 16384 }, // Stronger scrypt parameters
            (err, derivedKey) => {
                if (err) reject(err);
                resolve({ key: derivedKey, salt });
            }
        );
    });
}

// Legacy key derivation with fixed salt
exports.oldDeriveKey = async (password) => {
    return new Promise((resolve, reject) => {
        crypto.scrypt(
            password,
            'linkedin-cookie-salt', // Original fixed salt
            KEY_LENGTH,
            (err, derivedKey) => {
                if (err) reject(err);
                resolve(derivedKey);
            }
        );
    });
};

exports.encrypt = async (text) => {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    if (typeof text !== 'string') {
        throw new Error('Encryption input must be a string');
    }

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const salt = crypto.randomBytes(SALT_LENGTH);
        const { key } = await deriveKey(process.env.ENCRYPTION_KEY, salt);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        const encrypted = Buffer.concat([
            cipher.update(text),
            cipher.final()
        ]);

        // Format: salt:iv:encrypted
        return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (err) {
        throw new Error(`Encryption failed: ${err.message}`);
    }
};

exports.decrypt = async (hash) => {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable not set');
    }
    if (typeof hash !== 'string' || hash.length === 0) {
        throw new Error('Invalid encrypted data: empty or non-string input');
    }

    try {
        const [saltHex, ivHex, contentHex] = hash.split(':');

        if (!saltHex || !ivHex || !contentHex) {
            throw new Error('Invalid encrypted format - expected salt:iv:content');
        }

        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(contentHex, 'hex');

        if (iv.length !== IV_LENGTH) {
            throw new Error(`Invalid IV length: ${iv.length} bytes (expected ${IV_LENGTH})`);
        }

        const { key } = await deriveKey(process.env.ENCRYPTION_KEY, salt);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        const decryptedText = decrypted.toString();

        // Validate JSON structure
        JSON.parse(decryptedText);

        return decryptedText;
    } catch (err) {
        throw new Error(`Decryption failed: ${err.message}`);
    }
};

exports.legacyDecrypt = async (encryptedData) => {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable not set');
    }
    
    // More comprehensive check
    if (!encryptedData || typeof encryptedData !== 'string' || encryptedData.length === 0) {
        throw new Error('Invalid encrypted data: empty or non-string input');
    }
    
    try {
        // Check if this is the new format with salt:iv:content
        if (encryptedData.includes(':') && encryptedData.split(':').length === 3) {
            return await exports.decrypt(encryptedData);
        }

        // Legacy format was likely just iv:content in hex
        const parts = encryptedData.split(':');
        
        if (parts.length !== 2) {
            throw new Error('Invalid legacy encrypted format - expected iv:content');
        }

        const ivHex = parts[0];
        const contentHex = parts[1];
        
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(contentHex, 'hex');

        if (iv.length !== IV_LENGTH) {
            throw new Error(`Invalid IV length: ${iv.length} bytes (expected ${IV_LENGTH})`);
        }

        // Use the old key derivation method
        const key = await exports.oldDeriveKey(process.env.ENCRYPTION_KEY);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        const decryptedText = decrypted.toString();

        // Validate JSON structure
        JSON.parse(decryptedText);

        return decryptedText;
    } catch (err) {
        throw new Error(`Legacy decryption failed: ${err.message}`);
    }
};