import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateJobStatusCommand } from '../impl/update-job-status.command';
import { JobRepository } from '../../domain/repositories/job.repository';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { JobNotFoundException } from '../../exceptions/job-not-found.exception';
import { JobStatusChangedEvent } from '../../domain/events/job-status-changed.event';

@CommandHandler(UpdateJobStatusCommand)
export class UpdateJobStatusHandler implements ICommandHandler<UpdateJobStatusCommand> {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateJobStatusCommand): Promise<void> {
    const job = await this.jobRepository.findById(command.id);
    if (!job) throw new JobNotFoundException(command.id);

    const previousStatus = job.status;

    switch (command.status) {
      case JobStatus.SAVED:
        job.save();
        break;
      case JobStatus.APPLIED:
        job.markApplied();
        break;
      case JobStatus.INTERVIEWING:
        job.markInterviewing();
        break;
      case JobStatus.OFFERED:
        job.markOffered();
        break;
      case JobStatus.REJECTED:
        job.markRejected();
        break;
      case JobStatus.WITHDRAWN:
        job.withdraw();
        break;
      default:
        throw new Error(`Status ${command.status} cannot be set manually`);
    }

    if (command.notes !== undefined) {
      job.updateNotes(command.notes);
    }

    await this.jobRepository.save(job);

    // Per architecture rules (Events Rules, line 122-123):
    // "Domain events are dispatched in-process via the NestJS EventBus"
    // "Events are published from command handlers after state is persisted"
    this.eventBus.publish(
      new JobStatusChangedEvent(job.id, previousStatus, job.status, job.appliedAt ?? undefined),
    );
  }
}
