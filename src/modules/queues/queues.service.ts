import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Queue, QueueStatus } from './schemas/queue.schema';
import { CreateQueueDto } from './dto/create-queue.dto';
import { QueryQueueDto, QueuePaginatedResponse } from './dto/query-queue.dto';
import { NextQueueDto } from './dto/next-queue.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue as BullQueue } from 'bullmq';
import { transformObjectId } from '../../common/utils/transform-objectid.util';
import { WebSocketGateway } from './websocket/queue.gateway';
import { SortOrder } from '../../common/dtos/pagination.dto';

@Injectable()
export class QueuesService {
  constructor(
    @InjectModel(Queue.name)
    private queueModel: Model<Queue>,
    @InjectQueue('checkup-queue')
    private checkupQueue: BullQueue,
    private queueGateway: WebSocketGateway,
  ) { }

  async create(createQueueDto: CreateQueueDto): Promise<Queue> {
    // Check if queue already exists for this registration
    const existingQueue = await this.queueModel
      .findOne({ registrationId: createQueueDto.registrationId })
      .exec();

    if (existingQueue) {
      throw new BadRequestException('Queue already exists for this registration');
    }

    // Get the next queue number for the doctor on this date
    const queueDate = new Date(createQueueDto.queueDate);
    const startOfDay = new Date(queueDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queueDate.setHours(23, 59, 59, 999));

    const lastQueue = await this.queueModel
      .findOne({
        doctorId: createQueueDto.doctorId,
        queueDate: { $gte: startOfDay, $lte: endOfDay },
      })
      .sort({ queueNumber: -1 })
      .exec();

    const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

    const newQueue = new this.queueModel({
      ...createQueueDto,
      queueNumber,
      queueDate: new Date(createQueueDto.queueDate),
      status: QueueStatus.WAITING,
    });

    const savedQueue = await newQueue.save();

    // Add job to BullMQ for processing
    await this.checkupQueue.add('queue-created', {
      queueId: savedQueue._id.toString(),
      doctorId: savedQueue.doctorId,
      queueDate: savedQueue.queueDate,
    });

    // Emit real-time update via WebSocket
    const populatedQueue = await this.populateQueue(savedQueue);
    this.queueGateway.emitQueueUpdated(populatedQueue);

    return populatedQueue;
  }

  async findAll(queryDto: QueryQueueDto = {}): Promise<{ data: Queue[]; total: number }> {
    const { page = 1, limit = 10, doctorId, patientId, queueDate, status, sortBy, sortOrder = SortOrder.DESC } = queryDto;

    const pipeline: any[] = [];

    // === MATCH FILTER ===
    const match: any = {};

    if (doctorId) match.doctorId = new Types.ObjectId(doctorId);
    if (patientId) match.patientId = new Types.ObjectId(patientId);
    if (status) match.status = status;

    if (queueDate) {
      const date = new Date(queueDate);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      match.queueDate = { $gte: start, $lte: end };
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // === SORT ===
    const sortDirection = sortOrder === SortOrder.DESC ? -1 : 1;
    const sort = sortBy
      ? { [sortBy]: sortDirection }
      : { queueDate: -1, queueNumber: 1 };

    // === PAGINATION CALC ===
    const skip = (page - 1) * limit;

    // === FACET ===
    pipeline.push({
      $facet: {
        data: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          // lookup/ populate manual
          {
            $lookup: {
              from: 'patients',
              localField: 'patientId',
              foreignField: '_id',
              as: 'patientId',
            },
          },
          { $unwind: { path: '$patientId', preserveNullAndEmptyArrays: true } },

          {
            $lookup: {
              from: 'doctors',
              localField: 'doctorId',
              foreignField: '_id',
              as: 'doctorId',
            },
          },
          { $unwind: { path: '$doctorId', preserveNullAndEmptyArrays: true } },

          {
            $lookup: {
              from: 'registrations',
              localField: 'registrationId',
              foreignField: '_id',
              as: 'registrationId',
            },
          },
          { $unwind: { path: '$registrationId', preserveNullAndEmptyArrays: true } },
        ],
        totalData: [{ $count: 'count' }],
      },
    });

    // === PROJECT ===
    pipeline.push({
      $project: {
        data: 1,
        total: { $ifNull: [{ $arrayElemAt: ['$totalData.count', 0] }, 0] },
      },
    });

    // EXECUTE
    const result = await this.queueModel.aggregate(pipeline);

    return {
      data: result[0]?.data || [],
      total: result[0]?.total || 0,
    };
  }

  async findOne(id: string): Promise<Queue> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid queue ID');
    }

    const queue = await this.queueModel
      .findById(id)
      .populate('patientId', 'fullName email phoneNumber')
      .populate('doctorId', 'fullName specialization')
      .populate('registrationId')
      .lean()
      .exec();

    if (!queue) {
      throw new NotFoundException(`Queue with ID ${id} not found`);
    }

    return transformObjectId<Queue>(queue);
  }

  async getCurrentQueue(doctorId: string, queueDate: string): Promise<Queue | null> {
    const date = new Date(queueDate);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const currentQueue = await this.queueModel
      .findOne({
        doctorId: new Types.ObjectId(doctorId),
        queueDate: { $gte: startOfDay, $lte: endOfDay },
        status: QueueStatus.CURRENT,
      })
      .populate('patientId', 'fullName email phoneNumber')
      .populate('doctorId', 'fullName specialization')
      .populate('registrationId')
      .lean()
      .exec();

    return currentQueue ? transformObjectId<Queue>(currentQueue) : null;
  }

  async callNextQueue(nextQueueDto: NextQueueDto): Promise<Queue> {
    const { doctorId, queueDate } = nextQueueDto;
    const date = new Date(queueDate);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // Mark current queue as completed
    await this.queueModel
      .updateMany(
        {
          doctorId: new Types.ObjectId(doctorId),
          queueDate: { $gte: startOfDay, $lte: endOfDay },
          status: QueueStatus.CURRENT,
        },
        {
          $set: {
            status: QueueStatus.COMPLETED,
            completedAt: new Date(),
          },
        },
      )
      .exec();

    // Find next waiting queue
    const nextQueue = await this.queueModel
      .findOneAndUpdate(
        {
          doctorId: new Types.ObjectId(doctorId),
          queueDate: { $gte: startOfDay, $lte: endOfDay },
          status: QueueStatus.WAITING,
        },
        {
          $set: {
            status: QueueStatus.CURRENT,
            calledAt: new Date(),
          },
        },
        { new: true, sort: { queueNumber: 1 } },
      )
      .populate('patientId', 'fullName email phoneNumber')
      .populate('doctorId', 'fullName specialization')
      .populate('registrationId')
      .exec();

    if (!nextQueue) {
      throw new NotFoundException('No waiting queue found');
    }

    // Emit real-time update for the next queue via WebSocket
    this.queueGateway.emitQueueUpdated(nextQueue as Queue);

    // Emit real-time update for all queues of this doctor
    this.queueGateway.emitQueueListUpdated(doctorId, queueDate);

    return nextQueue as Queue;
  }

  async skipQueue(id: string): Promise<Queue> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid queue ID');
    }

    const queue = await this.queueModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: QueueStatus.SKIPPED,
          },
        },
        { new: true },
      )
      .populate('patientId', 'fullName email phoneNumber')
      .populate('doctorId', 'fullName specialization')
      .populate('registrationId')
      .exec();

    if (!queue) {
      throw new NotFoundException(`Queue with ID ${id} not found`);
    }

    // Emit real-time update via WebSocket
    this.queueGateway.emitQueueUpdated(queue as Queue);

    return queue as Queue;
  }

  async getQueuesByDoctor(doctorId: string, queueDate: string): Promise<Queue[]> {
    const date = new Date(queueDate);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const queues = await this.queueModel
      .find({
        doctorId: new Types.ObjectId(doctorId),
        queueDate: { $gte: startOfDay, $lte: endOfDay },
      })
      .sort({ queueNumber: 1 })
      .populate('patientId', 'fullName email phoneNumber')
      .populate('doctorId', 'fullName specialization')
      .populate('registrationId')
      .lean()
      .exec();

    return transformObjectId<Queue[]>(queues);
  }

  /**
   * Helper method to populate queue
   */
  async populateQueue(queue: any): Promise<Queue> {
    const populated = await this.queueModel
      .findById(queue._id)
      .populate('patientId', 'fullName email phoneNumber')
      .populate('doctorId', 'fullName specialization')
      .populate('registrationId')
      .lean()
      .exec();

    if (!populated) {
      throw new NotFoundException('Queue not found');
    }

    return transformObjectId<Queue>(populated);
  }

  /**
   * Bulk import queues from JSON data
   */
  async bulkImport(queues: any[]): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const queueData of queues) {
      try {
        // Find patient by email
        const patient = await this.queueModel.db.collection('users').findOne({ email: queueData.patientEmail });
        if (!patient || patient.role !== 'patient') {
          failed++;
          errors.push({ patientEmail: queueData.patientEmail, error: 'Patient not found or invalid role' });
          continue;
        }

        // Find doctor by email
        const doctor = await this.queueModel.db.collection('users').findOne({ email: queueData.doctorEmail });
        if (!doctor || doctor.role !== 'doctor') {
          failed++;
          errors.push({ doctorEmail: queueData.doctorEmail, error: 'Doctor not found or invalid role' });
          continue;
        }

        // Create queue
        const created = await this.queueModel.create({
          patientId: patient._id,
          doctorId: doctor._id,
          queueNumber: queueData.queueNumber,
          queueDate: new Date(queueData.queueDate),
          status: queueData.status,
        });

        success++;
      } catch (error) {
        failed++;
        errors.push({
          patientEmail: queueData.patientEmail,
          doctorEmail: queueData.doctorEmail,
          error: error.message
        });
      }
    }

    return { success, failed, errors };
  }
}
