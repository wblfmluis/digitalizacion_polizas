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
    @Query('idejercicio', ParseIntPipe) idejercicio: number,
    @Query('idmatriz', ParseIntPipe) idmatriz: number,
    @UserCookie() user: string,
  ) {
    return this.policiesService.getPolicies(
      {
        idejercicio: idejercicio,
        idmatriz: idmatriz,
      },
      user,
    );
  }
}
