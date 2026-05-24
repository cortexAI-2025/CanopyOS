import { Injectable } from '@nestjs/common';
import { GrowPhase, GrowType, GrowMethod, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface Strain {
  floweringWeeks: number;
}

interface GrowProject {
  id: string;
  growType: GrowType;
  growMethod: GrowMethod;
  startDate: Date;
  strain: Strain;
}

interface TaskInput {
  title: string;
  description?: string;
  dueDate: Date;
  status: TaskStatus;
  phase: GrowPhase;
  weekNumber: number;
  growProjectId: string;
}

interface NutrientPlanInput {
  phase: GrowPhase;
  weekNumber: number;
  targetPh: number;
  targetEc: number;
  nitrogenRatio: number;
  phosphorusRatio: number;
  potassiumRatio: number;
  notes?: string;
  growProjectId: string;
}

const GERMINATION_TASKS = [
  'Soak seeds 24h',
  'Plant in starter medium',
  'Maintain 70-80% humidity',
  'Monitor for sprout',
];

const VEGETATIVE_TASKS_PER_WEEK = [
  'Water plants',
  'Check pH levels',
  'Inspect for pests',
  'Train/top plants',
  'Adjust light schedule',
];

const FLOWERING_TASKS_PER_WEEK = [
  'Adjust nutrient mix',
  'Monitor trichomes',
  'Check bud development',
  'Reduce nitrogen',
  'Monitor humidity',
];

const FLUSH_TASKS = [
  'Begin flush with clean water',
  'Monitor runoff EC',
  'Final harvest check',
  'Harvest plant',
];

@Injectable()
export class PlannerService {
  constructor(private readonly prisma: PrismaService) {}

  private getVegetativeWeeks(growType: GrowType): number {
    switch (growType) {
      case GrowType.INDOOR:
        return 4;
      case GrowType.GREENHOUSE:
        return 5;
      case GrowType.OUTDOOR:
        return 6;
      default:
        return 4;
    }
  }

  private getFlushWeeks(growMethod: GrowMethod): number {
    return growMethod === GrowMethod.HYDROPONIC ? 2 : 1;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async generatePlan(project: GrowProject): Promise<void> {
    const tasks: TaskInput[] = [];
    const nutrients: NutrientPlanInput[] = [];

    const { id: growProjectId, growType, growMethod, startDate, strain } = project;
    const floweringWeeks = strain.floweringWeeks;
    const vegetativeWeeks = this.getVegetativeWeeks(growType);
    const flushWeeks = this.getFlushWeeks(growMethod);

    let currentWeek = 0;
    let currentDate = new Date(startDate);

    // ─── GERMINATION (week 1) ────────────────────────────────────────────────
    const germinationWeek = ++currentWeek;
    GERMINATION_TASKS.forEach((title, idx) => {
      tasks.push({
        title,
        dueDate: this.addDays(currentDate, idx * 2),
        status: TaskStatus.PENDING,
        phase: GrowPhase.GERMINATION,
        weekNumber: germinationWeek,
        growProjectId,
      });
    });

    nutrients.push({
      phase: GrowPhase.GERMINATION,
      weekNumber: germinationWeek,
      targetPh: 6.0,
      targetEc: 0.0,
      nitrogenRatio: 0,
      phosphorusRatio: 0,
      potassiumRatio: 0,
      notes: 'No nutrients needed during germination — use plain water.',
      growProjectId,
    });

    currentDate = this.addDays(currentDate, 7);

    // ─── VEGETATIVE ──────────────────────────────────────────────────────────
    for (let vWeek = 1; vWeek <= vegetativeWeeks; vWeek++) {
      const weekNumber = ++currentWeek;
      VEGETATIVE_TASKS_PER_WEEK.forEach((title, idx) => {
        tasks.push({
          title: `Week ${vWeek}: ${title}`,
          dueDate: this.addDays(currentDate, idx),
          status: TaskStatus.PENDING,
          phase: GrowPhase.VEGETATIVE,
          weekNumber,
          growProjectId,
        });
      });

      nutrients.push({
        phase: GrowPhase.VEGETATIVE,
        weekNumber,
        targetPh: 6.2,
        targetEc: 1.2,
        nitrogenRatio: 3,
        phosphorusRatio: 1,
        potassiumRatio: 2,
        notes: `Vegetative week ${vWeek}: high nitrogen for leaf development.`,
        growProjectId,
      });

      currentDate = this.addDays(currentDate, 7);
    }

    // ─── FLOWERING ───────────────────────────────────────────────────────────
    for (let fWeek = 1; fWeek <= floweringWeeks; fWeek++) {
      const weekNumber = ++currentWeek;
      FLOWERING_TASKS_PER_WEEK.forEach((title, idx) => {
        tasks.push({
          title: `Week ${fWeek}: ${title}`,
          dueDate: this.addDays(currentDate, idx),
          status: TaskStatus.PENDING,
          phase: GrowPhase.FLOWERING,
          weekNumber,
          growProjectId,
        });
      });

      const isEarlyFlowering = fWeek <= 4;
      nutrients.push({
        phase: GrowPhase.FLOWERING,
        weekNumber,
        targetPh: isEarlyFlowering ? 6.0 : 5.8,
        targetEc: isEarlyFlowering ? 1.8 : 2.2,
        nitrogenRatio: isEarlyFlowering ? 1 : 0.5,
        phosphorusRatio: isEarlyFlowering ? 2 : 3,
        potassiumRatio: isEarlyFlowering ? 3 : 4,
        notes: isEarlyFlowering
          ? `Early flowering week ${fWeek}: boost P/K, reduce N.`
          : `Late flowering week ${fWeek}: maximise P/K, minimal N.`,
        growProjectId,
      });

      currentDate = this.addDays(currentDate, 7);
    }

    // ─── FLUSH ───────────────────────────────────────────────────────────────
    for (let flushWeek = 1; flushWeek <= flushWeeks; flushWeek++) {
      const weekNumber = ++currentWeek;
      FLUSH_TASKS.forEach((title, idx) => {
        tasks.push({
          title: `Flush ${flushWeek}: ${title}`,
          dueDate: this.addDays(currentDate, idx * 2),
          status: TaskStatus.PENDING,
          phase: GrowPhase.FLUSH,
          weekNumber,
          growProjectId,
        });
      });

      nutrients.push({
        phase: GrowPhase.FLUSH,
        weekNumber,
        targetPh: 6.5,
        targetEc: 0.0,
        nitrogenRatio: 0,
        phosphorusRatio: 0,
        potassiumRatio: 0,
        notes: `Flush week ${flushWeek}: plain water only to clear residual nutrients.`,
        growProjectId,
      });

      currentDate = this.addDays(currentDate, 7);
    }

    // ─── Persist in a transaction ────────────────────────────────────────────
    await this.prisma.$transaction([
      this.prisma.task.createMany({ data: tasks }),
      this.prisma.nutrientPlan.createMany({ data: nutrients }),
    ]);
  }
}
