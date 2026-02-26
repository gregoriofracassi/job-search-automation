export class JobNotFoundException extends Error {
  constructor(id: string) {
    super(`Job ${id} not found`);
    this.name = 'JobNotFoundException';
  }
}
