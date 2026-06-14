import { PrismaClient } from '../generated/prisma/index.js';
import { prisma } from '../config/database.js';

export class AnalysisTaskService {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createTask(data: { userId: number; type: string; content?: string; filePath?: string }) {
    return this.prisma.analysisTask.create({ data, include: { user: true } });
  }

  async getTaskById(id: number) {
    return this.prisma.analysisTask.findUnique({ where: { id }, include: { user: true } });
  }

  async updateTask(id: number, data: any) {
    return this.prisma.analysisTask.update({ where: { id }, data, include: { user: true } });
  }

  async getUserTasks(userId: number, options: { skip?: number; take?: number; status?: string; type?: string } = {}) {
    const where: any = { userId };
    if (options.status) where.status = options.status;
    if (options.type) where.type = options.type;
    return this.prisma.analysisTask.findMany({
      where, skip: options.skip, take: options.take,
      orderBy: { createdAt: 'desc' }, include: { user: true },
    });
  }

  async deleteTask(id: number) {
    return this.prisma.analysisTask.delete({ where: { id } });
  }
}

export const analysisTaskService = new AnalysisTaskService();
