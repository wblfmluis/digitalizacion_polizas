import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import {
  UserJwt,
  UserCookie,
} from '../common/decorators/user-cookie.decorator';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  async getPolicies(
    @UserCookie() user: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('offset') offset: string,
    @Query('idejercicio') idejercicio?: string,
    @Query('idmatriz') idmatriz?: string,
    @Query('archivo') archivo?: string,
  ) {
    return this.policiesService.getPolicies(
      {
        page: page,
        pageSize: pageSize,
        offset: offset,
        idejercicio: idejercicio,
        idmatriz: idmatriz,
        archivo: archivo,
      },
      user,
    );
  }

  @Get('stats')
  async getPoliciesStats(
    @Query('idejercicio') idejercicio?: string,
    @Query('idmatriz') idmatriz?: string,
    @Query('fechaFrom') fechaFrom?: string,
    @Query('fechaTo') fechaTo?: string,
  ) {
    return this.policiesService.getPolizasStats({
      idejercicio,
      idmatriz,
      fechaFrom,
      fechaTo,
    });
  }
}
