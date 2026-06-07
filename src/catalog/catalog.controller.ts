import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import * as ejercicioDto from './dto/ejercicio.dto';
import * as tipoAccionDto from './dto/tipo-accion.dto';
import * as entidadDto from './dto/entidad.dto';
import * as camposSistemaDto from './dto/campos-sistema.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@UseGuards(AuthGuard, RolesGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('ejercicio')
  @Roles('admin', 'operador', 'consulta')
  async findAllEjercicios() {
    return this.catalogService.findAllEjercicios();
  }

  @Post('ejercicio')
  @Roles('admin')
  async createEjercicio(
    @Body() data: ejercicioDto.CreateEjercicioDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.createEjercicio(data, user.email);
  }

  @Put('ejercicio/:id')
  @Roles('admin')
  async updateEjercicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ejercicioDto.UpdateEjercicioDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.updateEjercicio(id, data, user.email);
  }

  @Delete('ejercicio/:id')
  @Roles('admin')
  async deleteEjercicio(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.deleteEjercicio(id, user.email);
  }

  @Get('tipo-accion')
  @Roles('admin', 'operador', 'consulta')
  async findAllTipoAccion() {
    return this.catalogService.findAllTipoAccion();
  }

  @Post('tipo-accion')
  @Roles('admin')
  async createTipoAccion(
    @Body() data: tipoAccionDto.CreateTipoAccionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.createTipoAccion(data, user.email);
  }

  @Put('tipo-accion/:id')
  @Roles('admin')
  async updateTipoAccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: tipoAccionDto.UpdateTipoAccionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.updateTipoAccion(id, data, user.email);
  }

  @Get('entidad')
  @Roles('admin', 'operador', 'consulta')
  async findAllEntidades() {
    return this.catalogService.findAllEntidades();
  }

  @Post('entidad')
  @Roles('admin')
  async createEntidad(
    @Body() data: entidadDto.CreateEntidadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.createEntidad(data, user.email);
  }

  @Put('entidad/:id')
  @Roles('admin')
  async updateEntidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: entidadDto.UpdateEntidadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.updateEntidad(id, data, user.email);
  }

  @Get('campos-sistema')
  @Roles('admin', 'operador', 'consulta')
  async findAllCamposSistema() {
    return this.catalogService.findAllCamposSistema();
  }

  @Post('campos-sistema')
  @Roles('admin')
  async createCampoSistema(
    @Body() data: camposSistemaDto.CreateCamposSistemaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.createCampoSistema(data, user.email);
  }

  @Put('campos-sistema/:id')
  @Roles('admin')
  async updateCampoSistema(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: camposSistemaDto.UpdateCamposSistemaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogService.updateCampoSistema(id, data, user.email);
  }
}
