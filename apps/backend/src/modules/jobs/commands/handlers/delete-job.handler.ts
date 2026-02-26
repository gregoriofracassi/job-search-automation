import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteJobCommand } from '../impl/delete-job.command';
import { JobRepository } from '../../domain/repositories/job.repository';
import { JobNotFoundException } from '../../exceptions/job-not-found.exception';

@CommandHandler(DeleteJobCommand)
export class DeleteJobHandler implements ICommandHandler<DeleteJobCommand> {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(command: DeleteJobCommand): Promise<void> {
    const job = await this.jobRepository.findById(command.id);
    if (!job) throw new JobNotFoundException(command.id);
    await this.jobRepository.delete(command.id);
  }
}
