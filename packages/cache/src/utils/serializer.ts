import { SerializationType } from '../types';

/**
 * Cache serialization utility
 * Handles different serialization formats for cache values
 */
export class CacheSerializer {
  constructor(private type: SerializationType = 'json') {}

  serialize(value: any): string | Buffer {
    switch (this.type) {
      case 'json':
        return JSON.stringify(value);
      
      case 'string':
        return String(value);
      
      case 'buffer':
        if (Buffer.isBuffer(value)) {
          return value;
        }
        return Buffer.from(JSON.stringify(value));
      
      case 'msgpack':
        // Would require msgpack library
        // For now, fallback to JSON
        return JSON.stringify(value);
      
      default:
        return JSON.stringify(value);
    }
  }

  deserialize<T>(data: string | Buffer): T {
    switch (this.type) {
      case 'json':
        const jsonStr = Buffer.isBuffer(data) ? data.toString() : data;
        return JSON.parse(jsonStr);
      
      case 'string':
        return (Buffer.isBuffer(data) ? data.toString() : data) as T;
      
      case 'buffer':
        return data as T;
      
      case 'msgpack':
        // Would require msgpack library
        // For now, fallback to JSON
        const msgpackStr = Buffer.isBuffer(data) ? data.toString() : data;
        return JSON.parse(msgpackStr);
      
      default:
        const defaultStr = Buffer.isBuffer(data) ? data.toString() : data;
        return JSON.parse(defaultStr);
    }
  }

  getType(): SerializationType {
    return this.type;
  }

  setType(type: SerializationType): void {
    this.type = type;
  }
}