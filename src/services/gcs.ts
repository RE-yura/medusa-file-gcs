import { AbstractFileService, IFileService } from "@medusajs/medusa";
import { Storage } from "@google-cloud/storage";
import {
  DeleteFileType,
  FileServiceUploadResult,
  GetUploadedFileType,
  UploadStreamDescriptorType,
} from "@medusajs/types";
import { MedusaError } from "medusa-core-utils";

import stream from "stream";
import { GetSignedUrlConfig } from "@google-cloud/storage";
import { parse } from "path";

export interface CredentialBody {
  client_email?: string;
  private_key?: string;
}

export interface GcpStorageServiceOptions {
  credentials: CredentialBody;
  bucket: string;
}

type File = Express.Multer.File;

class GcpStorageService extends AbstractFileService implements IFileService {
  protected projectId: string;
  protected bucketName: string;
  protected privatebucketName: string;
  protected email: string;
  protected privateKey: string;
  protected privateEmail: string;
  protected privatePrivateKey: string;

  constructor({}, options) {
    super({}, options);
    this.projectId = options.projectId;
    this.bucketName = options.bucketName;
    this.privatebucketName = options.privatebucketName;
    this.email = options.email;
    this.privateKey = options.privateKey;
    this.privateEmail = options.privateEmail;
    this.privatePrivateKey = options.privatePrivateKey;
  }

  protected getBaseUrl(bucketName: string) {
    return `https://storage.googleapis.com/${bucketName}/`;
  }

  protected getClient(usePrivateBucket = false) {
    return new Storage({
      projectId: this.projectId,
      credentials: {
        client_email: usePrivateBucket ? this.privateEmail : this.email,
        private_key: usePrivateBucket ? this.privatePrivateKey : this.privateKey,
      },
    });
  }
  protected getBucket(usePrivateBucket = false) {
    const storage = this.getClient(usePrivateBucket);
    return storage.bucket(usePrivateBucket ? this.privatebucketName : this.bucketName);
  }

  validatePrivateBucketConfiguration_(usePrivateBucket: boolean) {
    if (
      usePrivateBucket &&
      (!this.privateEmail || !this.privatePrivateKey || !this.privatebucketName)
    ) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Private bucket is not configured");
    }
  }

  async upload(file: File): Promise<FileServiceUploadResult> {
    return await this.uploadFile(file);
  }

  async uploadProtected(file: File): Promise<FileServiceUploadResult> {
    this.validatePrivateBucketConfiguration_(true);

    return await this.uploadFile(file, { isProtected: true });
  }

  protected async uploadFile(
    file: File,
    options: { isProtected: boolean } = { isProtected: false }
  ) {
    const parsedFilename = parse(file.originalname);
    const fileKey = `${parsedFilename.name}-${Date.now()}${parsedFilename.ext}`;

    const bucket = this.getBucket(options.isProtected);

    const result = await bucket.upload(file.path, {
      predefinedAcl: options.isProtected ? "private" : "publicRead",
      destination: fileKey,
    });

    return { url: result[0].publicUrl(), key: result[0].kmsKeyName ?? "" };
  }

  async delete(file: DeleteFileType): Promise<void> {
    const bucket = this.getBucket(false);
    const privateBucket = this.getBucket(true);

    await Promise.all([
      new Promise((resolve, reject) =>
        bucket.file(file.fileKey).delete((err, apiResponse) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(apiResponse);
        })
      ),
      new Promise((resolve, reject) =>
        privateBucket.file(file.fileKey).delete((err, apiResponse) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(apiResponse);
        })
      ),
    ]);
  }

  async getUploadStreamDescriptor(
    fileData: UploadStreamDescriptorType & {
      contentType?: string;
    }
  ) {
    const usePrivateBucket = fileData.isPrivate ?? true;

    this.validatePrivateBucketConfiguration_(usePrivateBucket);

    const bucket = this.getBucket(usePrivateBucket);

    const fileKey = `${fileData.name}.${fileData.ext}`;
    const pass = new stream.PassThrough();

    return {
      writeStream: pass,
      promise: new Promise(() => pass.pipe(bucket.file(fileKey).createWriteStream())),
      url: `${this.getBaseUrl(bucket.name)}/${fileKey}`,
      fileKey,
    };
  }

  async getDownloadStream(fileData: GetUploadedFileType) {
    const usePrivateBucket = fileData.isPrivate ?? true;
    this.validatePrivateBucketConfiguration_(usePrivateBucket);
    const bucket = this.getBucket(usePrivateBucket);

    return bucket.file(fileData.fileKey).createReadStream();
  }

  async getPresignedDownloadUrl({ isPrivate = true, ...fileData }: GetUploadedFileType) {
    this.validatePrivateBucketConfiguration_(isPrivate);

    const bucket = this.getBucket(isPrivate);
    const fileKey = fileData.fileKey;

    const options = {
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 MINUTES
    } as GetSignedUrlConfig;

    const ret = await bucket.file(fileKey).getSignedUrl(options);
    return ret[0];
  }
}

export default GcpStorageService;
