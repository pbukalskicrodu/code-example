import * as AWS from 'aws-sdk';
import { Request, Response } from 'express';
import * as mime from 'mime';
import * as multer from 'multer';
import * as uuid from 'uuid/v4';
import { config } from '../../config';
import { IFile } from './file.interface';

const upload = multer({ limits: { fileSize: config.aws.maxFileSize } });
const client = new AWS.S3(config.aws);

export class UploadController {
  public static middleware(field) {
    return (req: Request & { file: IFile }, res: Response, next) => {
      upload.none()(req, res, () => {
        if (!req.body[field] || !(['/', 'i'].includes(req.body[field].charAt(0)))) {
          return res.status(400).send({ error: field.charAt(0).toUpperCase() + field.slice(1) + ' not found.' });
        }

        req.file = {
          buffer: Buffer.from(req.body[field], 'base64'),
          extension: (req.body[field].charAt(0) === '/') ? 'jpg' : 'png',
        };

        next();
      });
    };
  }

  public static upload(file: IFile, bucket: string) {
    return new Promise((resolve, reject) => {
      const { buffer, extension } = file;
      const name = uuid() + '.' + extension;

      const params = {
        ACL: 'public-read',
        Body: buffer,
        Bucket: bucket,
        ContentType: mime.getType(extension),
        Key: name,
      };

      client.putObject(params, (err) => {
        if (err) {
          return reject(err);
        }

        resolve(name);
      });
    });
  }

  public static delete(names: string[], bucket: string) {
    return new Promise((resolve, reject) => {
      if (!names.length) { return resolve(); }

      const params = {
        Bucket: bucket,
        Delete: {
          Objects: names.map(name => ({ Key: name })),
          Quiet: false,
        },
      };

      client.deleteObjects(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
