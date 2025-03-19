// src/jobs/jobs.controller.ts
import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getAllJobs() {
    try {
      const jobs = await this.jobsService.getAllJobs();
      return jobs;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
