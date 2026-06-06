import { Router } from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  createTask,
  updateTask,
  deleteTask
} from '../controllers/project.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { 
  createProjectSchema, 
  updateProjectSchema, 
  createTaskSchema, 
  updateTaskSchema 
} from '../validations/project.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Projects routing
router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', requireRoles([Role.ADMIN, Role.MANAGER]), validateRequest(createProjectSchema), createProject);
router.put('/:id', requireRoles([Role.ADMIN, Role.MANAGER]), validateRequest(updateProjectSchema), updateProject);
router.delete('/:id', requireRoles([Role.ADMIN, Role.MANAGER]), deleteProject);

// Tasks routing
router.post('/:id/tasks', requireRoles([Role.ADMIN, Role.MANAGER]), validateRequest(createTaskSchema), createTask);
router.put('/tasks/:taskId', validateRequest(updateTaskSchema), updateTask); // Assignee (Employee) can update status, Manager can edit all
router.delete('/tasks/:taskId', requireRoles([Role.ADMIN, Role.MANAGER]), deleteTask);

export default router;
