// Module: storage
// Encrypted IndexedDB storage for StegoChannel

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { argon2id } from '../core/crypto';
import sodium from 'libsodium-wrappers-sumo';

// Database name uses stealth naming per stealth-ux spec
const DB_NAME = 'feed_cache';
const DB_VERSION = 1;

// Storage schema
interface StegoChannelDB extends DBSchema {
  channels: {
    key: string; // channel ID
    value: EncryptedData;
  };
  messages: {
    key: string; // composite: channelId:timestamp
    value: EncryptedData;
    indexes: { 'by-channel': string }; // channelId
  };
  state: {
    key: string; // state key (e.g., 'transmission:channelId')
    value: EncryptedData;
  };
  credentials: {
    key: string; // credential ID
    value: EncryptedData;
  };
  meta: {
    key: string; // metadata key
    value: unknown; // unencrypted metadata
  };
}

// Encrypted data structure
interface EncryptedData {
  // AES-256-GCM ciphertext
  ciphertext: Uint8Array;
  // Initialization vector (12 bytes for GCM)
  iv: Uint8Array;
  // Authentication tag (16 bytes, included in Web Crypto output)
  // Version marker for future schema changes
  version: number;
}

// Channel configuration
export interface Channel {
  id: string;
  name: string;
  key: Uint8Array; // 32-byte channel key
  beaconType: 'date' | 'btc' | 'nist';
  platform: 'bluesky' | 'rss';
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Message record
export interface Message {
  id: string;
  channelId: string;
  content: Uint8Array;
  timestamp: Date;
  senderSources: string[];
  bitCount: number;
  authenticated: boolean;
  metadata?: Record<string, unknown>;
}

// Transmission state
export interface TransmissionState {
  channelId: string;
  messageContent: Uint8Array;
  bitsSent: number;
  draftBuffer: string[];
  sourceUsage: Record<string, number>;
  lastUpdated: Date;
}

// Storage interface
export interface StorageInterface {
  // Channel operations
  saveChannel(channel: Channel): Promise<void>;
  getChannel(id: string): Promise<Channel | null>;
  listChannels(): Promise<Channel[]>;
  deleteChannel(id: string): Promise<void>;

  // Message operations
  saveMessage(channelId: string, message: Message): Promise<void>;
  getMessages(channelId: string, limit?: number, offset?: number): Promise<Message[]>;

  // State operations
  saveState(key: string, state: unknown): Promise<void>;
  getState<T>(key: string): Promise<T | null>;
  deleteState(key: string): Promise<void>;

  // Credential operations
  saveCredential(id: string, credential: unknown): Promise<void>;
  getCredential<T>(id: string): Promise<T | null>;
  deleteCredential(id: string): Promise<void>;

  // Lock operations
  lock(): void;
  isUnlocked(): boolean;

  // Utility
  close(): Promise<void>;
}

// Storage implementation
class SecureStorage implements StorageInterface {
  private db: IDBPDatabase<StegoChannelDB> | null = null;
  private encryptionKey: CryptoKey | null = null;

  constructor(
    db: IDBPDatabase<StegoChannelDB>,
    encryptionKey: CryptoKey
  ) {
    this.db = db;
    this.encryptionKey = encryptionKey;
  }

  // AES-256-GCM encryption using Web Crypto
  private async encrypt(data: unknown): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error('Storage is locked');
    }

    // Serialize data to JSON then to bytes
    const json = JSON.stringify(data);
    const plaintext = new TextEncoder().encode(json);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt with AES-256-GCM
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128, // 16 bytes
      },
      this.encryptionKey,
      plaintext
    );

    return {
      ciphertext: new Uint8Array(ciphertext),
      iv: iv,
      version: 1,
    };
  }

  // AES-256-GCM decryption using Web Crypto
  private async decrypt<T>(encrypted: EncryptedData): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('Storage is locked');
    }

    if (encrypted.version !== 1) {
      throw new Error(`Unsupported encrypted data version: ${encrypted.version}`);
    }

    // Ensure we have proper Uint8Arrays (IndexedDB may return plain objects)
    const iv = encrypted.iv instanceof Uint8Array
      ? encrypted.iv
      : new Uint8Array(Object.values(encrypted.iv));
    const ciphertext = encrypted.ciphertext instanceof Uint8Array
      ? encrypted.ciphertext
      : new Uint8Array(Object.values(encrypted.ciphertext));

    // Decrypt with AES-256-GCM
    // Create fresh ArrayBuffers to avoid offset issues from IndexedDB retrieval
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv).buffer as ArrayBuffer,
        tagLength: 128,
      },
      this.encryptionKey,
      new Uint8Array(ciphertext).buffer as ArrayBuffer
    );

    // Deserialize from bytes to JSON to object
    const json = new TextDecoder().decode(plaintext);
    return JSON.parse(json) as T;
  }

  // Channel operations
  async saveChannel(channel: Channel): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await this.encrypt(channel);
    await this.db.put('channels', encrypted, channel.id);
  }

  async getChannel(id: string): Promise<Channel | null> {
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await this.db.get('channels', id);
    if (!encrypted) return null;

    return this.decrypt<Channel>(encrypted);
  }

  async listChannels(): Promise<Channel[]> {
    if (!this.db) throw new Error('Database not initialized');

    const allEncrypted = await this.db.getAll('channels');
    const channels = await Promise.all(
      allEncrypted.map(encrypted => this.decrypt<Channel>(encrypted))
    );

    return channels;
  }

  async deleteChannel(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Delete channel
    await this.db.delete('channels', id);

    // Delete all messages for this channel
    const tx = this.db.transaction('messages', 'readwrite');
    const index = tx.store.index('by-channel');
    let cursor = await index.openCursor(IDBKeyRange.only(id));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;

    // Delete transmission state if exists
    await this.deleteState(`transmission:${id}`);
  }

  // Message operations
  async saveMessage(channelId: string, message: Message): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await this.encrypt(message);
    const key = `${channelId}:${message.timestamp.getTime()}`;
    await this.db.put('messages', encrypted, key);
  }

  async getMessages(
    channelId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction('messages', 'readonly');
    const index = tx.store.index('by-channel');

    let cursor = await index.openCursor(IDBKeyRange.only(channelId), 'prev');
    const messages: Message[] = [];
    let currentOffset = 0;

    while (cursor && messages.length < limit) {
      if (currentOffset >= offset) {
        const decrypted = await this.decrypt<Message>(cursor.value);
        messages.push(decrypted);
      }
      currentOffset++;
      cursor = await cursor.continue();
    }

    await tx.done;
    return messages;
  }

  // State operations
  async saveState(key: string, state: unknown): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await this.encrypt(state);
    await this.db.put('state', encrypted, key);
  }

  async getState<T>(key: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await this.db.get('state', key);
    if (!encrypted) return null;

    return this.decrypt<T>(encrypted);
  }

  async deleteState(key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('state', key);
  }

  // Credential operations
  async saveCredential(id: string, credential: unknown): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await this.encrypt(credential);
    await this.db.put('credentials', encrypted, id);
  }

  async getCredential<T>(id: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await this.db.get('credentials', id);
    if (!encrypted) return null;

    return this.decrypt<T>(encrypted);
  }

  async deleteCredential(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('credentials', id);
  }

  // Lock operations
  lock(): void {
    // Clear encryption key from memory
    this.encryptionKey = null;
  }

  isUnlocked(): boolean {
    return this.encryptionKey !== null;
  }

  // Close database connection
  async close(): Promise<void> {
    this.lock();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Initialize storage with passphrase
export async function initStorage(passphrase: string): Promise<StorageInterface> {
  // Ensure libsodium is ready
  await sodium.ready;

  // Open database
  const db = await openDB<StegoChannelDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Channels store
      if (!db.objectStoreNames.contains('channels')) {
        db.createObjectStore('channels');
      }

      // Messages store with channel index
      if (!db.objectStoreNames.contains('messages')) {
        const messagesStore = db.createObjectStore('messages');
        messagesStore.createIndex('by-channel', 'channelId', { unique: false });
      }

      // State store
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state');
      }

      // Credentials store
      if (!db.objectStoreNames.contains('credentials')) {
        db.createObjectStore('credentials');
      }

      // Meta store (unencrypted)
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    },
  });

  // Get or generate salt
  let saltRaw = await db.get('meta', 'salt');
  let salt: Uint8Array;
  if (!saltRaw) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    await db.put('meta', salt, 'salt');
  } else {
    // Ensure salt is a proper Uint8Array (IndexedDB may return plain object)
    salt = saltRaw instanceof Uint8Array
      ? saltRaw
      : new Uint8Array(Object.values(saltRaw as Record<string, number>));
  }

  // Derive encryption key using Argon2id
  // Per spec: memory=64MB, iterations=3, parallelism=4
  const keyMaterial = argon2id(
    passphrase,
    salt,
    3, // opsLimit (iterations)
    64 * 1024 * 1024 // memLimit (64 MB)
  );

  // Import key for Web Crypto AES-GCM
  // Create fresh ArrayBuffer to avoid offset issues
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyMaterial).buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  // Return storage interface
  return new SecureStorage(db, cryptoKey);
}

// Convenience function to lock storage
export function lockStorage(storage: StorageInterface): void {
  storage.lock();
}

// Convenience function to check if storage is unlocked
export function isUnlocked(storage: StorageInterface): boolean {
  return storage.isUnlocked();
}

// Bluesky session persistence
// AtpSessionData type from @atproto/api
export interface AtpSessionData {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  active: boolean;
  email?: string;
  emailConfirmed?: boolean;
  emailAuthFactor?: boolean;
}

const BLUESKY_SESSION_KEY = 'bluesky_session';

// Save Bluesky session (encrypted)
export async function saveBlueskySession(
  storage: StorageInterface,
  session: AtpSessionData
): Promise<void> {
  await storage.saveCredential(BLUESKY_SESSION_KEY, session);
}

// Get stored Bluesky session (decrypted)
export async function getBlueskySession(
  storage: StorageInterface
): Promise<AtpSessionData | null> {
  return storage.getCredential<AtpSessionData>(BLUESKY_SESSION_KEY);
}

// Clear stored Bluesky session (for logout)
export async function clearBlueskySession(
  storage: StorageInterface
): Promise<void> {
  await storage.deleteCredential(BLUESKY_SESSION_KEY);
}

// Check if Bluesky session exists
export async function hasBlueskySession(
  storage: StorageInterface
): Promise<boolean> {
  const session = await getBlueskySession(storage);
  return session !== null;
}
