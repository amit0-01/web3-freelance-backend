import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class ApplyJobDto {
  @IsNotEmpty()
  @IsNumber()
  jobId: number;

  @IsNotEmpty()
  @IsString()
  coverLetter: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  proposedRate: number;

  @IsNotEmpty()
  @IsString()
  estimatedDuration: string;

  @IsOptional()
  @IsString()
  portfolioLink?: string;
}
