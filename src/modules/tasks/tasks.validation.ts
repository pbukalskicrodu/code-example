import { STATUSES, statusValues } from '../../consts';
import { joi } from '../../customJoi';

const getTask = {
  params: {
    id: joi.string().objectId().required(),
  },
  query: {
    status: joi.string().valid(statusValues).default(STATUSES.PENDING),
  },
};

const updateTask = {
  body: {
    attachments: joi.array().items(joi.string().max(64)),
    doneDate: joi.alternatives(joi.string().isoDate(), joi.equal(null)),
    status: joi.string().valid(statusValues),
    userInfo: joi.alternatives(joi.string().min(0).max(4000), joi.equal('', null)),
  },
};

const uploadAttachment = {
  body: {
    attachment: joi.any(),
  },
};

export {
  getTask,
  updateTask,
  uploadAttachment,
};
