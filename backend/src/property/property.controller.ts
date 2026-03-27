import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { CreatePropertyDto } from './dto/create-property.dto';
import {
  buildStoredPropertyImagePath,
  createPropertyUploadStorage,
  propertyImageFileFilter,
} from './property-upload';
import { PropertyService } from './property.service';

@ApiTags('property')
@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post('images/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: createPropertyUploadStorage(),
      fileFilter: propertyImageFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10,
      },
    }),
  )
  @ApiResponse({ status: 200, description: 'Property images uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid upload payload' })
  uploadImages(
    @UploadedFiles() files?: Array<{ filename: string }>,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucune image reçue.');
    }

    return {
      images: files.map((file) => buildStoredPropertyImagePath(file.filename)),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'The property has been created' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not create the property' })
  create(
    @Body() createPropertyDto: CreatePropertyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.propertyService.create(createPropertyDto, request.user);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'All the properties have been fetched' })
  @ApiResponse({ status: 404, description: 'No properties in the database' })
  findAll() {
    return this.propertyService.findPublished();
  }

  @Get('manage')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Manageable properties fetched' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findManageable(@Req() request: AuthenticatedRequest) {
    return this.propertyService.findManageable(request.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Current user properties fetched' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMine(@Req() request: AuthenticatedRequest) {
    return this.propertyService.findOwnedByUser(request.user.userId);
  }

  @Get('name/:name')
  @ApiResponse({ status: 200, description: 'The property has been fetched' })
  @ApiResponse({ status: 404, description: 'Could not find the property' })
  findOneByName(@Param('name') name: string) {
    return this.propertyService.findOneByName(name);
  }

  @Get('manage/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'The property has been fetched for management' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Could not find the property' })
  findOneForManagement(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.propertyService.findOneForManagement(Number(id), request.user);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'The property has been fetched' })
  @ApiResponse({ status: 404, description: 'Could not find the property' })
  findOneById(@Param('id') id: string) {
    return this.propertyService.findOneById(Number(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'The property has been updated' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not update the property' })
  update(
    @Param('id') id: string,
    @Body() createPropertyDto: CreatePropertyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.propertyService.update(Number(id), createPropertyDto, request.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'The property has been deleted' })
  @ApiResponse({ status: 500, description: 'Could not find the property' })
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.propertyService.remove(Number(id), request.user);
  }
}
