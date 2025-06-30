import { Injectable, BadRequestException } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
  private readonly s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID, // set in your .env file
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // set in your .env file
      region: process.env.AWS_REGION, // set in your .env file
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    try {
      const uploadResult = await this.s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET, // your S3 bucket name
          Key: fileName,
          Body: fileBuffer,
          ContentType: mimeType,
        })
        .promise();

      return uploadResult.Location;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new BadRequestException('Failed to upload file to S3');
    }
  }

  /**
   * Deletes a file from S3 given its URL.
   * @param url The full URL of the file on S3.
   */
  async deleteFileFromUrl(url: string): Promise<void> {
    try {
      // Extract the file key from the URL.
      // Assuming the URL follows the pattern: https://{bucket}.s3.amazonaws.com/{key}
      const urlObj = new URL(url);
      // Remove the leading slash from the pathname to get the key.
      const fileKey = urlObj.pathname.startsWith('/')
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;

      await this.s3
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileKey,
        })
        .promise();
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new BadRequestException('Failed to delete file from S3');
    }
  }
}
