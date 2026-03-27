import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { basename, extname, isAbsolute, join } from 'path';

const propertyUploadsSegment = 'properties';
const publicPropertyUploadsPrefix = `/uploads/${propertyUploadsSegment}`;

function getUploadsRoot() {
  const configuredDirectory = process.env.UPLOAD_DIR?.trim();

  if (!configuredDirectory) {
    return join(process.cwd(), 'uploads');
  }

  return isAbsolute(configuredDirectory)
    ? configuredDirectory
    : join(process.cwd(), configuredDirectory);
}

export function getUploadRootAbsolutePath() {
  const uploadRoot = getUploadsRoot();

  if (!existsSync(uploadRoot)) {
    mkdirSync(uploadRoot, { recursive: true });
  }

  return uploadRoot;
}

export function getPropertyUploadAbsolutePath() {
  const propertyUploadPath = join(
    getUploadRootAbsolutePath(),
    propertyUploadsSegment,
  );

  if (!existsSync(propertyUploadPath)) {
    mkdirSync(propertyUploadPath, { recursive: true });
  }

  return propertyUploadPath;
}

export function createPropertyUploadStorage() {
  const { diskStorage } = require('multer') as {
    diskStorage: (options: {
      destination: (
        request: unknown,
        file: unknown,
        callback: (error: Error | null, destination: string) => void,
      ) => void;
      filename: (
        request: unknown,
        file: { originalname: string },
        callback: (error: Error | null, filename: string) => void,
      ) => void;
    }) => unknown;
  };

  return diskStorage({
    destination: (_request, _file, callback) => {
      callback(null, getPropertyUploadAbsolutePath());
    },
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase() || '.bin';
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  });
}

export function propertyImageFileFilter(
  _request: unknown,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype.startsWith('image/')) {
    callback(
      new BadRequestException(
        'Format invalide. Seuls les fichiers image sont acceptés.',
      ),
      false,
    );
    return;
  }

  callback(null, true);
}

export function buildStoredPropertyImagePath(filename: string) {
  return `${publicPropertyUploadsPrefix}/${filename}`;
}

function extractStoredPropertyFilename(imagePath: string) {
  const markerIndex = imagePath.indexOf(publicPropertyUploadsPrefix);

  if (markerIndex === -1) {
    return null;
  }

  const rawFilename = imagePath
    .slice(markerIndex + publicPropertyUploadsPrefix.length + 1)
    .split(/[?#]/)[0]
    .trim();

  if (!rawFilename || rawFilename.includes('/') || rawFilename.includes('\\')) {
    return null;
  }

  return basename(rawFilename);
}

export function deleteStoredPropertyImages(imagePaths: string[]) {
  for (const imagePath of imagePaths) {
    const filename = extractStoredPropertyFilename(imagePath);

    if (!filename) {
      continue;
    }

    const absoluteFilePath = join(getPropertyUploadAbsolutePath(), filename);

    if (existsSync(absoluteFilePath)) {
      unlinkSync(absoluteFilePath);
    }
  }
}
