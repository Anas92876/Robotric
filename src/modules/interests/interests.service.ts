import { ConflictError, NotFoundError, ValidationError } from '../../shared/http/errors';
import type { InterestFilter, InterestRepository, InterestWithCreator } from './interests.repository';

export interface UpdateInterestInput {
  name?: string;
  description?: string | null;
  status?: 'active' | 'archived';
}

const duplicate = () => new ConflictError('Interest with this name already exists', 'DUPLICATE_INTEREST');

export class InterestService {
  constructor(private readonly interests: InterestRepository) {}

  list(filter: InterestFilter): Promise<InterestWithCreator[]> {
    return this.interests.list(filter);
  }

  async get(id: string): Promise<InterestWithCreator> {
    const interest = await this.interests.findById(id);
    if (!interest) throw new NotFoundError('Interest');
    return interest;
  }

  async create(input: { name?: string; description?: string | null }, createdById: string): Promise<InterestWithCreator> {
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Interest name is required');
    if (await this.interests.nameExists(name)) throw duplicate();
    return this.interests.create({ name, description: input.description?.trim() ?? null, createdById });
  }

  async update(id: string, input: UpdateInterestInput): Promise<InterestWithCreator> {
    const current = await this.get(id);
    const changes: UpdateInterestInput = {};
    const name = input.name?.trim();
    if (name && name !== current.name) {
      if (await this.interests.nameExists(name)) throw duplicate();
      changes.name = name;
    }
    if (input.description !== undefined) changes.description = input.description?.trim() ?? null;
    if (input.status) changes.status = input.status;
    return this.interests.update(id, changes);
  }

  async archive(id: string): Promise<InterestWithCreator> {
    await this.get(id);
    return this.interests.update(id, { status: 'archived' });
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.interests.delete(id);
  }
}
