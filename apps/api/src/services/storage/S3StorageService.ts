import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand,
  NoSuchKey
} from '@aws-sdk/client-s3';
import { StorageBackend } from './types';

export class S3StorageService implements StorageBackend {
  private s3Client: S3Client;

  constructor(
    private config: {
      bucketName: string;
      region: string;
      accessKey: string;
      secretKey: string;
      endpoint?: string;
    }
  ) {
    this.initializeS3Client();
  }

  private initializeS3Client(): void {
    try {
      this.s3Client = new S3Client({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKey,
          secretAccessKey: this.config.secretKey,
        },
        ...(this.config.endpoint && { endpoint: this.config.endpoint }),
      });

      console.log(`S3 client initialized successfully for bucket: ${this.config.bucketName}`);
    } catch (error) {
      console.error('Failed to initialize S3 client', error);
      throw new Error(`Failed to initialize S3 storage: ${error.message}`);
    }
  }

  async store(file: Buffer, fileName: string, directory: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    if (!fileName?.trim()) {
      throw new Error('Filename cannot be empty');
    }

    try {
      const key = directory ? `${directory}/${fileName}` : fileName;

      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: file,
        ContentLength: file.length,
      });

      await this.s3Client.send(command);
      
      console.log(`File uploaded to S3 successfully: ${key}`);
      return key;
      
    } catch (error) {
      throw new Error(`Could not upload file to S3: ${fileName} - ${error.message}`);
    }
  }

  async loadAsBuffer(fileName: string): Promise<Buffer> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('File not found in S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
      
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new Error(`File not found in S3: ${fileName}`);
      }
      throw new Error(`Could not load file from S3: ${fileName} - ${error.message}`);
    }
  }

  async delete(fileName: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      console.log(`File deleted from S3 successfully: ${fileName}`);
      
    } catch (error) {
      throw new Error(`Could not delete file from S3: ${fileName} - ${error.message}`);
    }
  }

  async exists(fileName: string): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      return true;
      
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return false;
      }
      console.error(`Error checking file existence in S3: ${fileName}`, error);
      return false;
    }
  }

  getFileUrl(fileName: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.config.bucketName}/${fileName}`;
    } else {
      return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${fileName}`;
    }
  }

  getStorageType(): string {
    return 's3';
  }
}