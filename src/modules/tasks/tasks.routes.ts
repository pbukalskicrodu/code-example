import * as express from 'express';
import * as winston from 'winston';
import { errorWrap } from '../../error-handling';
import { authenticate } from '../auth';
import { UploadController } from '../upload/upload.controller';
import { validate } from '../validation';
import { TasksController } from './tasks.controller';
import { getTask, updateTask } from './tasks.validation';

winston.info('Loading Tasks module...');

const router = express.Router();

router.get(
  '/',
  authenticate,
  errorWrap(TasksController.getTasks),
).get(
  '/completeness',
  authenticate,
  errorWrap(TasksController.getUserCompletion),
).get(
  '/:id',
  authenticate,
  validate(getTask),
  errorWrap(TasksController.getTask),
).put(
  '/:taskId',
  authenticate,
  validate(updateTask),
  errorWrap(TasksController.updateTask),
).post(
  '/attachments',
  authenticate,
  UploadController.middleware('attachment'),
  errorWrap(TasksController.uploadAttachment),
);

export const tasksRouter = router;
