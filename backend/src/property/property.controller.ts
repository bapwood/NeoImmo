import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('property')
@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @ApiResponse({ status: 200, description: 'The property has been created' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not create the property' })
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertyService.create(createPropertyDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'All the properties have been fetched' })
  @ApiResponse({ status: 404, description: 'No properties in the database' })
  findAll() {
    return this.propertyService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'The property has fetched' })
  @ApiResponse({ status: 404, description: 'Could not find the property' })
  findOneById(@Param('id') id: string) {
    return this.propertyService.findOneById(+id);
  }

  @Get(':name')
  @ApiResponse({ status: 200, description: 'The property has been fetched' })
  @ApiResponse({ status: 404, description: 'Could not find the property' })
  findOneByName(@Param('id') name: string) {
    return this.propertyService.findOneByName(name);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, description: 'The property has been updated' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not update the property' })
  update(
    @Param('id') id: string,
    @Body() createPropertyDto: CreatePropertyDto,
  ) {
    return this.propertyService.update(+id, createPropertyDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'The property has been deleted' })
  @ApiResponse({ status: 500, description: 'Could not find the property' })
  remove(@Param('id') id: string) {
    return this.propertyService.remove(+id);
  }
}
