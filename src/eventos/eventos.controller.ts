import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  async getLogEvents(
    @CurrentUser() user: AuthUser,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('offset') offset: string,
    @Query('fechaFrom') fechaFrom?: string,
    @Query('fechaTo') fechaTo?: string,
    @Query('busqueda') q?: string,
  ) {
    return this.eventosService.viewLogEvent(
      {
        page: page,
        pageSize: pageSize,
        offset: offset,
        fechaFrom: fechaFrom,
        fechaTo: fechaTo,
        q: q,
      },
      user.email,
    );
  }
}
