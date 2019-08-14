import { Request, Response } from 'express';
import * as mongoose from 'mongoose';
import { config } from '../../config';
import { PRIORITIES, STATUSES } from '../../consts';
import { CustomError, ErrorTypes } from '../../error-handling';
import { ITask, Task } from '../../models';
import { UploadController } from '../upload';
import { IFile } from '../upload/file.interface';

const getTaskAddFields = language => ({
  $addFields: {
    'examination.description': `$examination.description.${language}`,
    'examination.name': `$examination.name.${language}`,
    'examination.shortDescription': `$examination.shortDescription.${language}`,
  },
});

export class TasksController {
  public static async getTasks(req: Request, res: Response) {
    const language = req.get('Accept-Language');
    const pipeline: any[] = [
      { $match: { status: req.query.status, userId: req.user._id } },
      {
        $lookup: {
          as: 'examination',
          foreignField: '_id',
          from: 'examinations',
          localField: 'examinationId',
        },
      },
      { $addFields: { examination: { $arrayElemAt: ['$examination', 0] } } },
    ];

    if (language) {
      pipeline.push(getTaskAddFields(language));
    }

    const results = await Task.aggregate(pipeline);

    const completeness = TasksController.getCompleteness(results);

    res.status(200).json({ completeness, results });
  }

  public static async getTask(req: Request, res: Response) {
    const language = req.get('Accept-Language');
    const pipeline: any[] = [
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id), userId: req.user._id } },
      {
        $lookup: {
          as: 'examination',
          foreignField: '_id',
          from: 'examinations',
          localField: 'examinationId',
        },
      },
      { $addFields: { examination: { $arrayElemAt: ['$examination', 0] } } },
    ];

    if (language) {
      pipeline.push(getTaskAddFields(language));
    }

    const tasks = await Task.aggregate(pipeline);

    if (tasks.length === 0) {
      throw new CustomError(ErrorTypes.NotFound, 'Task not found');
    }

    res.status(200).json(tasks[0]);
  }

  public static async updateTask(req: Request, res: Response) {
    const { body, params } = req;
    const { taskId } = params;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new CustomError(ErrorTypes.NotFound, 'Task not found');
    }

    const taskObject = task.toObject();
    const attachmentsToDelete = taskObject.attachments.filter(
      attachment => !body.attachments.includes(attachment),
    );

    await UploadController.delete(attachmentsToDelete, config.aws.tasksAttachmentsBucket);

    const taskBody = { ...task.toObject(), ...body };

    await task.updateOne(taskBody);

    res.status(204).end();
  }

  public static async getUserCompletion(req: Request, res: Response) {
    const { user } = req;

    const tasks: ITask[] = await Task.find({ userId: user._id });
    const completeness = TasksController.getCompleteness(tasks);

    res.status(200).json(completeness);
  }

  public static async uploadAttachment(req: Request & { file: IFile }, res: Response) {
    UploadController.upload(req.file, config.aws.tasksAttachmentsBucket)
      .then(name => res.status(201).json({ name }))
      .catch((err) => {
        throw new CustomError(ErrorTypes.Unknown, 'Upload error');
      });
  }

  private static getCompleteness(tasks) {
    const completeTasks: ITask[] = tasks.filter(task => task.status === STATUSES.DONE);

    const totalPriority = tasks.reduce((prev, curr) => prev + 1 + PRIORITIES.OPTIONAL - curr.priority, 0);
    const completePriority = completeTasks.reduce((prev, curr) => prev + 1 + PRIORITIES.OPTIONAL - curr.priority, 0);

    const percentageTasks = tasks.length === 0 ? 0 : completeTasks.length / tasks.length * 100;
    const percentagePriority = totalPriority === 0 ? 0 : completePriority / totalPriority * 100;

    return {
      completePriority,
      completeTasks: completeTasks.length,
      percentagePriority,
      percentageTasks,
      totalPriority,
      totalTasks: tasks.length,
    };
  }
}
