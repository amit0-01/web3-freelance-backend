// src/jobs/jobs.controller.ts
import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getAllJobs(@Query('search') search?: string,@Query('category') category?: string) {
    try {
      return await this.jobsService.getJobs(search, category);
    } catch (error) {
      throw new HttpException(
        'Failed to fetch jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
