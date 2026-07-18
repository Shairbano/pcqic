

const express = require('express');
const router  = express.Router({ mergeParams: true });
const { verifyUser } = require('../middleware/authMiddleware');
const {
  createTask, listTasks, getTask, taskAction, getMyTasks, deleteTask,
} = require('../controllers/taskController');

router.use(verifyUser);

router.post('/',                   createTask);  // POST   .../tasks
router.get('/',                    listTasks);   // GET    .../tasks
router.get('/:taskId',             getTask);     // GET    .../tasks/:taskId
router.patch('/:taskId/action',    taskAction);  // PATCH  .../tasks/:taskId/action
router.delete('/:taskId',          deleteTask);  // DELETE .../tasks/:taskId

module.exports = router;
