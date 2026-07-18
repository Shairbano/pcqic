const { createTask, listTasks, getTask, deleteTask } = require('./task/taskCrud');
const { taskAction } = require('./task/taskActions');
const { getMyTasks } = require('./task/taskMyTasks');

module.exports = { createTask, listTasks, getTask, taskAction, getMyTasks, deleteTask };