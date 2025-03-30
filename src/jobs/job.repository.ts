import { EntityRepository, Repository } from 'typeorm';
import { Job } from './job.entity';

@EntityRepository(Job)
export class JobRepository extends Repository<Job> {}
