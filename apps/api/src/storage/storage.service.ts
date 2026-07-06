import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly provider: string;
  private readonly localPath: string;

  constructor(private config: ConfigService) {
    this.provider = config.get('STORAGE_PROVIDER', 'local');
    this.localPath = config.get('STORAGE_LOCAL_PATH', './uploads');

    if (this.provider === 'local') {
      fs.mkdirSync(this.localPath, { recursive: true });
    }
  }

  async upload(file: Buffer, key: string, contentType?: string): Promise<UploadResult> {
    if (this.provider === 's3') {
      return this.uploadToS3(file, key, contentType);
    }
    return this.uploadLocal(file, key);
  }

  async delete(key: string): Promise<void> {
    if (this.provider === 's3') {
      // S3 delete implementation placeholder
      console.log(`[Storage] S3 delete: ${key}`);
      return;
    }
    const filePath = path.join(this.localPath, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getUrl(key: string): string {
    if (this.provider === 's3') {
      const bucket = this.config.get('AWS_S3_BUCKET');
      const region = this.config.get('AWS_REGION', 'us-east-1');
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    return `/uploads/${key}`;
  }

  private async uploadLocal(file: Buffer, key: string): Promise<UploadResult> {
    const filePath = path.join(this.localPath, key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file);
    return { key, url: this.getUrl(key) };
  }

  private async uploadToS3(file: Buffer, key: string, contentType?: string): Promise<UploadResult> {
    // S3 upload placeholder - wire AWS SDK in production
    console.log(`[Storage] S3 upload: ${key} (${contentType})`);
    return { key, url: this.getUrl(key) };
  }
}
