import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import * as ejercicioDto from './dto/ejercicio.dto';
import * as tipoAccionDto from './dto/tipo-accion.dto';
import * as entidadDto from './dto/entidad.dto';
import * as camposSistemaDto from './dto/campos-sistema.dto';
import { UserCookie } from '../common/decorators/user-cookie.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('ejercicio')
  async findAllEjercicios() {
    return this.catalogService.findAllEjercicios();
  }

  @Post('ejercicio')
  async createEjercicio(
    @Body() data: ejercicioDto.CreateEjercicioDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.createEjercicio(data, user);
  }

  @Put('ejercicio/:id')
  async updateEjercicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ejercicioDto.UpdateEjercicioDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.updateEjercicio(id, data, user);
  }

  @Get('tipo-accion')
  async findAllTipoAccion() {
    return this.catalogService.findAllTipoAccion();
  }

  @Post('tipo-accion')
  async createTipoAccion(
    @Body() data: tipoAccionDto.CreateTipoAccionDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.createTipoAccion(data, user);
  }

  @Put('tipo-accion/:id')
  async updateTipoAccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: tipoAccionDto.UpdateTipoAccionDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.updateTipoAccion(id, data, user);
  }

  @Get('entidad')
  async findAllEntidades() {
    return this.catalogService.findAllEntidades();
  }

  @Post('entidad')
  async createEntidad(
    @Body() data: entidadDto.CreateEntidadDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.createEntidad(data, user);
  }

  @Put('entidad/:id')
  async updateEntidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: entidadDto.UpdateEntidadDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.updateEntidad(id, data, user);
  }

  @Get('campos-sistema')
  async findAllCamposSistema() {
    return this.catalogService.findAllCamposSistema();
  }

  @Post('campos-sistema')
  async createCampoSistema(
    @Body() data: camposSistemaDto.CreateCamposSistemaDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.createCampoSistema(data, user);
  }

  @Put('campos-sistema/:id')
  async updateCampoSistema(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: camposSistemaDto.UpdateCamposSistemaDto,
    @UserCookie() user: string,
  ) {
    return this.catalogService.updateCampoSistema(id, data, user);
  }
}
