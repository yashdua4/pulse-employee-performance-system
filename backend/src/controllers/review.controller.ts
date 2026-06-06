import { Request, Response } from 'express';
import { PrismaClient, Role, ReviewStatus } from '@prisma/client';
import { logAction } from '../utils/audit.js';

const prisma = new PrismaClient();

// Helper to create notifications
const createNotification = async (userId: string, title: string, message: string, type: string) => {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type },
    });
  } catch (err) {
    console.error('Failed to generate notification:', err);
  }
};

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { role, employeeId } = req.user;

    let reviews;

    if (role === Role.ADMIN) {
      reviews = await prisma.performanceReview.findMany({
        include: {
          reviewee: {
            select: { id: true, name: true, designation: true, department: { select: { name: true } } },
          },
          reviewer: {
            select: { id: true, name: true, designation: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === Role.MANAGER) {
      // Managers see reviews they wrote OR reviews for employees who report to them
      const subordinates = await prisma.employee.findMany({
        where: { managerId: employeeId },
        select: { id: true },
      });
      const subordinateIds = subordinates.map((s) => s.id);

      reviews = await prisma.performanceReview.findMany({
        where: {
          OR: [
            { reviewerId: employeeId },
            { revieweeId: { in: subordinateIds } },
          ],
        },
        include: {
          reviewee: {
            select: { id: true, name: true, designation: true, department: { select: { name: true } } },
          },
          reviewer: {
            select: { id: true, name: true, designation: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Employees only see their own reviews (that are SUBMITTED or ACKNOWLEDGED)
      reviews = await prisma.performanceReview.findMany({
        where: {
          revieweeId: employeeId,
          status: {
            in: [ReviewStatus.SUBMITTED, ReviewStatus.ACKNOWLEDGED],
          },
        },
        include: {
          reviewee: {
            select: { id: true, name: true, designation: true, department: { select: { name: true } } },
          },
          reviewer: {
            select: { id: true, name: true, designation: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return res.json(reviews);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving reviews', error: error.message });
  }
};

export const getReviewById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const review = await prisma.performanceReview.findUnique({
      where: { id },
      include: {
        reviewee: {
          select: { id: true, name: true, designation: true, department: { select: { name: true } }, managerId: true },
        },
        reviewer: {
          select: { id: true, name: true, designation: true },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Role check
    if (req.user?.role === Role.EMPLOYEE && req.user.employeeId) {
      if (review.revieweeId !== req.user.employeeId) {
        return res.status(403).json({ message: 'Forbidden: You cannot access this review' });
      }
      if (review.status === ReviewStatus.DRAFT) {
        return res.status(403).json({ message: 'Forbidden: Review is not yet published' });
      }
    } else if (req.user?.role === Role.MANAGER && req.user.employeeId) {
      const isReviewer = review.reviewerId === req.user.employeeId;
      const isManagerOfReviewee = review.reviewee.managerId === req.user.employeeId;
      if (!isReviewer && !isManagerOfReviewee) {
        return res.status(403).json({ message: 'Forbidden: Access denied to this review' });
      }
    }

    return res.json(review);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving review details', error: error.message });
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { 
      revieweeId, 
      period, 
      technicalSkills, 
      communication, 
      teamwork, 
      problemSolving, 
      leadership, 
      feedback, 
      goals, 
      status 
    } = req.body;

    if (!revieweeId || !period || !feedback) {
      return res.status(400).json({ message: 'Reviewee, period, and feedback are required' });
    }

    const t = parseInt(technicalSkills) || 5;
    const c = parseInt(communication) || 5;
    const tw = parseInt(teamwork) || 5;
    const p = parseInt(problemSolving) || 5;
    const l = parseInt(leadership) || 5;
    
    // Average
    const overallRating = Math.round(((t + c + tw + p + l) / 5) * 10) / 10;

    const reviewee = await prisma.employee.findUnique({ where: { id: revieweeId } });
    if (!reviewee) {
      return res.status(404).json({ message: 'Reviewee employee not found' });
    }

    // Role check: Managers can only review employees who report to them
    if (req.user.role === Role.MANAGER && reviewee.managerId !== req.user.employeeId) {
      return res.status(403).json({ message: 'Forbidden: You can only review direct reports' });
    }

    const review = await prisma.performanceReview.create({
      data: {
        revieweeId,
        reviewerId: req.user.employeeId,
        period,
        technicalSkills: t,
        communication: c,
        teamwork: tw,
        problemSolving: p,
        leadership: l,
        overallRating,
        feedback,
        goals: Array.isArray(goals) ? JSON.stringify(goals) : goals || '[]',
        status: (status as ReviewStatus) || ReviewStatus.DRAFT,
      },
    });

    await logAction(req.user.id, 'REVIEW_CREATE', null, { id: review.id, rating: overallRating });

    // Send Notification to Employee if submitted
    if (status === 'SUBMITTED') {
      await createNotification(
        reviewee.userId,
        'Performance Review Published',
        `Your manager has published your evaluation review for period ${period}. Please review and acknowledge.`,
        'REVIEW_DUE'
      );
    }

    return res.status(201).json(review);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating performance review', error: error.message });
  }
};

export const updateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      technicalSkills, 
      communication, 
      teamwork, 
      problemSolving, 
      leadership, 
      feedback, 
      goals, 
      status, 
      period 
    } = req.body;

    const review = await prisma.performanceReview.findUnique({
      where: { id },
      include: { reviewee: true },
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Employee role check: Acknowledge review
    if (req.user?.role === Role.EMPLOYEE) {
      if (review.revieweeId !== req.user.employeeId) {
        return res.status(403).json({ message: 'Forbidden: You cannot modify this review' });
      }

      if (review.status !== ReviewStatus.SUBMITTED) {
        return res.status(400).json({ message: 'You can only acknowledge published reviews' });
      }

      if (status !== ReviewStatus.ACKNOWLEDGED) {
        return res.status(400).json({ message: 'Invalid status update' });
      }

      const updated = await prisma.performanceReview.update({
        where: { id },
        data: { status: ReviewStatus.ACKNOWLEDGED },
      });

      await logAction(req.user.id, 'REVIEW_ACKNOWLEDGE', { id }, { status: 'ACKNOWLEDGED' });

      return res.json(updated);
    }

    // Manager/Admin role check
    if (req.user?.role === Role.MANAGER && review.reviewerId !== req.user.employeeId) {
      return res.status(403).json({ message: 'Forbidden: You can only edit reviews you wrote' });
    }

    if (review.status === ReviewStatus.ACKNOWLEDGED && req.user?.role !== Role.ADMIN) {
      return res.status(400).json({ message: 'Cannot edit acknowledged reviews' });
    }

    const t = technicalSkills !== undefined ? parseInt(technicalSkills) : review.technicalSkills;
    const c = communication !== undefined ? parseInt(communication) : review.communication;
    const tw = teamwork !== undefined ? parseInt(teamwork) : review.teamwork;
    const p = problemSolving !== undefined ? parseInt(problemSolving) : review.problemSolving;
    const l = leadership !== undefined ? parseInt(leadership) : review.leadership;
    const overallRating = Math.round(((t + c + tw + p + l) / 5) * 10) / 10;

    const updateData: any = {
      technicalSkills: t,
      communication: c,
      teamwork: tw,
      problemSolving: p,
      leadership: l,
      overallRating,
      feedback,
      period,
      status: status as ReviewStatus,
    };

    if (goals !== undefined) {
      updateData.goals = Array.isArray(goals) ? JSON.stringify(goals) : goals;
    }

    const updated = await prisma.performanceReview.update({
      where: { id },
      data: updateData,
    });

    await logAction(req.user?.id, 'REVIEW_UPDATE', { id, rating: review.overallRating }, { rating: overallRating });

    // Notify employee if status is changed from DRAFT to SUBMITTED
    if (review.status === 'DRAFT' && status === 'SUBMITTED') {
      await createNotification(
        review.reviewee.userId,
        'Performance Review Published',
        `Your manager has published your evaluation review for period ${period || review.period}.`,
        'REVIEW_DUE'
      );
    }

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating performance review', error: error.message });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const review = await prisma.performanceReview.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (req.user?.role === Role.MANAGER && review.reviewerId !== req.user.employeeId) {
      return res.status(403).json({ message: 'Forbidden: You did not write this review' });
    }

    await prisma.performanceReview.delete({ where: { id } });

    await logAction(req.user?.id, 'REVIEW_DELETE', { id }, null);

    return res.json({ message: 'Performance review deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting performance review', error: error.message });
  }
};
