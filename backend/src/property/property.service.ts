import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Property } from '@prisma/client';
import type { AuthenticatedRequestUser } from 'src/auth/types/authenticated-request';
import { deleteStoredPropertyImages } from './property-upload';

type PropertyWithKeyPoints = Prisma.PropertyGetPayload<{
  include: {
    keyPoints: true;
  };
}>;

type PublicProperty = Property & {
  keyPoints: string[];
};

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePropertyDto, user: AuthenticatedRequestUser): Promise<PublicProperty> {
    const { keyPoints, ...propertyData } = data;
    const normalizedImages = this.normalizeImagePaths(propertyData.images);

    try {
      const property = await this.prisma.property.create({
        data: {
          ...propertyData,
          images: normalizedImages,
          ownerId: user.role === 'CLIENT' ? user.userId : undefined,
          keyPoints: this.buildKeyPointCreateData(keyPoints),
        },
        include: {
          keyPoints: true,
        },
      });

      return this.toPublicProperty(property);
    } catch (error) {
      deleteStoredPropertyImages(normalizedImages);

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Could not create a property' + error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  async findPublished(): Promise<PublicProperty[] | null> {
    try {
      const properties = await this.prisma.property.findMany({
        include: {
          keyPoints: true,
        },
        where: {
          ownerId: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return properties.map((property) => this.toPublicProperty(property));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No property in the database',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async findManageable(user: AuthenticatedRequestUser): Promise<PublicProperty[]> {
    try {
      const properties = await this.prisma.property.findMany({
        include: {
          keyPoints: true,
        },
        where: user.role === 'ADMIN' ? undefined : { ownerId: user.userId },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return properties.map((property) => this.toPublicProperty(property));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No property in the database',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async findOwnedByUser(userId: number): Promise<PublicProperty[]> {
    try {
      const properties = await this.prisma.property.findMany({
        include: {
          keyPoints: true,
        },
        where: {
          ownerId: userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return properties.map((property) => this.toPublicProperty(property));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No property in the database',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async findOneById(id: number): Promise<PublicProperty | null> {
    try {
      const property = await this.prisma.property.findFirst({
        include: {
          keyPoints: true,
        },
        where: {
          id,
          ownerId: null,
        },
      });

      return property ? this.toPublicProperty(property) : null;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Property not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async findOneByName(name: string): Promise<PublicProperty | null> {
    try {
      const property = await this.prisma.property.findFirst({
        include: {
          keyPoints: true,
        },
        where: {
          name,
          ownerId: null,
        },
      });

      return property ? this.toPublicProperty(property) : null;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Property not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async findOneForManagement(
    id: number,
    user: AuthenticatedRequestUser,
  ): Promise<PublicProperty> {
    const property = await this.assertPropertyAccess(id, user);

    return this.toPublicProperty(property);
  }

  async update(
    id: number,
    data: CreatePropertyDto,
    user: AuthenticatedRequestUser,
  ): Promise<PublicProperty> {
    let addedImages: string[] = [];

    try {
      const existingProperty = await this.assertPropertyAccess(id, user);
      const { keyPoints, ...propertyData } = data;
      const normalizedImages = this.normalizeImagePaths(propertyData.images);
      const removedImages = this.getRemovedImages(
        existingProperty.images,
        normalizedImages,
      );
      addedImages = this.getAddedImages(existingProperty.images, normalizedImages);

      const property = await this.prisma.property.update({
        where: {
          id,
        },
        data: {
          ...propertyData,
          images: normalizedImages,
          ownerId:
            user.role === 'CLIENT'
              ? user.userId
              : existingProperty.ownerId,
          keyPoints: this.buildKeyPointUpdateData(keyPoints),
        },
        include: {
          keyPoints: true,
        },
      });

      deleteStoredPropertyImages(removedImages);

      return this.toPublicProperty(property);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }

      deleteStoredPropertyImages(addedImages);

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Could not update the property',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  async remove(id: number, user: AuthenticatedRequestUser) {
    try {
      const property = await this.assertPropertyAccess(id, user);

      const deletedProperty = await this.prisma.property.delete({
        where: {
          id,
        },
      });

      deleteStoredPropertyImages(property.images);

      return deletedProperty;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Could not delete the property',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  private async assertPropertyAccess(
    propertyId: number,
    user: AuthenticatedRequestUser,
  ) {
    const property = await this.prisma.property.findUnique({
      include: {
        keyPoints: true,
      },
      where: {
        id: propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (user.role === 'CLIENT' && property.ownerId !== user.userId) {
      throw new ForbiddenException('You cannot manage this property');
    }

    return property;
  }

  private toPublicProperty(property: PropertyWithKeyPoints): PublicProperty {
    const { keyPoints, ...propertyData } = property;

    return {
      ...propertyData,
      keyPoints: keyPoints.map((keyPoint) => keyPoint.label),
    };
  }

  private buildKeyPointCreateData(keyPoints?: string[]) {
    const normalizedLabels = this.normalizeKeyPoints(keyPoints);

    if (normalizedLabels.length === 0) {
      return undefined;
    }

    return {
      connectOrCreate: normalizedLabels.map((label) => ({
        where: { label },
        create: { label },
      })),
    };
  }

  private buildKeyPointUpdateData(keyPoints?: string[]) {
    if (!keyPoints) {
      return undefined;
    }

    const normalizedLabels = this.normalizeKeyPoints(keyPoints);

    return {
      set: [],
      ...(normalizedLabels.length > 0
        ? {
            connectOrCreate: normalizedLabels.map((label) => ({
              where: { label },
              create: { label },
            })),
          }
        : {}),
    };
  }

  private normalizeKeyPoints(keyPoints?: string[]) {
    if (!keyPoints) {
      return [];
    }

    return [...new Set(
      keyPoints
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()),
    )];
  }

  private normalizeImagePaths(imagePaths?: string[]) {
    if (!imagePaths) {
      return [];
    }

    return [...new Set(
      imagePaths
        .map((imagePath) => imagePath.trim())
        .filter(Boolean),
    )];
  }

  private getRemovedImages(currentImages: string[], nextImages: string[]) {
    const nextImagesSet = new Set(nextImages);
    return currentImages.filter((image) => !nextImagesSet.has(image));
  }

  private getAddedImages(currentImages: string[], nextImages: string[]) {
    const currentImagesSet = new Set(currentImages);
    return nextImages.filter((image) => !currentImagesSet.has(image));
  }
}
