import { Controller, Get, Query } from '@nestjs/common';
import { EventosService } from './eventos.service';
import {
  UserJwt,
  UserCookie,
} from '../common/decorators/user-cookie.decorator';

@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  async getLogEvents(
    @UserCookie() user: string,
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
      user,
    );
  }
}
