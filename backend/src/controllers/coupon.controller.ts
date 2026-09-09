import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const prisma = new PrismaClient();

// ─── GET ALL COUPONS (PAGINATED, FILTERED, SORTED) ──────────────────────────
export const getAllCoupons = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const {
      is_active,
      status, // 'all', 'active', 'inactive', 'expired'
      search,
      discount_type,
      applicable_to,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};
    const now = new Date();

    // Active / Status filtering
    if (status && status !== 'all') {
      if (status === 'active') {
        where.is_active = true;
        where.AND = [
          { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
          { OR: [{ valid_until: null }, { valid_until: { gte: now } }] },
        ];
      } else if (status === 'inactive') {
        where.is_active = false;
      } else if (status === 'expired') {
        where.valid_until = { lt: now };
      }
    } else if (is_active !== undefined) {
      where.is_active = String(is_active) === 'true';
    }

    if (discount_type && discount_type !== 'ALL') {
      where.discount_type = discount_type;
    }

    if (applicable_to && applicable_to !== 'ALL') {
      where.applicable_to = applicable_to;
    }

    // Search query by code
    if (search && String(search).trim()) {
      where.code = {
        contains: String(search).trim(),
        mode: 'insensitive',
      };
    }

    // Sort order
    const orderBy: any = {};
    if (sortBy === 'code') {
      orderBy.code = sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'discount_value') {
      orderBy.discount_value = sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'used_count') {
      orderBy.used_count = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.created_at = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const [coupons, total, allCoupons] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        select: {
          id: true,
          is_active: true,
          valid_until: true,
          used_count: true,
        },
      }),
    ]);

    // Compute stats
    let totalActive = 0;
    let totalExpired = 0;
    let totalUses = 0;

    allCoupons.forEach((c) => {
      totalUses += c.used_count || 0;
      const isExpired = c.valid_until && new Date(c.valid_until) < now;
      if (isExpired) {
        totalExpired++;
      } else if (c.is_active) {
        totalActive++;
      }
    });

    const paginatedResponse = createPaginatedResponse(coupons, total, page, limit);

    res.json({
      ...paginatedResponse,
      stats: {
        totalCount: allCoupons.length,
        totalActive,
        totalExpired,
        totalUses,
      },
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

// ─── GET SINGLE COUPON BY ID ────────────────────────────────────────────────
export const getCouponById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const coupon = await prisma.coupon.findUnique({ where: { id: Number(id) } });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({ data: coupon });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ error: 'Failed to fetch coupon' });
  }
};

// ─── CREATE COUPON ──────────────────────────────────────────────────────────
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const {
      code,
      discount_type,
      discount_value,
      is_active,
      valid_from,
      valid_until,
      max_uses,
      min_order_amount,
      applicable_to,
      applicable_course_ids,
      applicable_test_series_ids,
      applicable_activity_ids,
      max_discount_amount,
    } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    if (!discount_type || !['PERCENTAGE', 'FLAT'].includes(discount_type)) {
      return res.status(400).json({ error: 'Discount type must be PERCENTAGE or FLAT' });
    }

    const parsedDiscountValue = Number(discount_value);
    if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
      return res.status(400).json({ error: 'Discount value must be greater than 0' });
    }

    if (discount_type === 'PERCENTAGE' && parsedDiscountValue > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100' });
    }

    const parsedMaxUses =
      max_uses === undefined || max_uses === null || max_uses === ''
        ? null
        : Number(max_uses);

    if (parsedMaxUses !== null && (Number.isNaN(parsedMaxUses) || parsedMaxUses <= 0)) {
      return res.status(400).json({ error: 'Max uses must be greater than 0' });
    }

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const parsedValidFrom = valid_from ? new Date(valid_from) : null;
    const parsedValidUntil = valid_until ? new Date(valid_until) : null;

    if (parsedValidFrom && Number.isNaN(parsedValidFrom.getTime())) {
      return res.status(400).json({ error: 'Invalid valid_from date' });
    }

    if (parsedValidUntil && Number.isNaN(parsedValidUntil.getTime())) {
      return res.status(400).json({ error: 'Invalid valid_until date' });
    }

    if (parsedValidFrom && parsedValidUntil && parsedValidFrom > parsedValidUntil) {
      return res.status(400).json({ error: 'valid_until must be after valid_from' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        discount_type,
        discount_value: parsedDiscountValue,
        is_active: is_active === undefined ? true : Boolean(is_active),
        valid_from: parsedValidFrom,
        valid_until: parsedValidUntil,
        max_uses: parsedMaxUses,
        min_order_amount: min_order_amount !== undefined && min_order_amount !== '' && min_order_amount !== null ? Number(min_order_amount) : null,
        applicable_to: applicable_to || 'ALL',
        applicable_course_ids: Array.isArray(applicable_course_ids) ? applicable_course_ids : [],
        applicable_test_series_ids: Array.isArray(applicable_test_series_ids) ? applicable_test_series_ids : [],
        applicable_activity_ids: Array.isArray(applicable_activity_ids) ? applicable_activity_ids : [],
        max_discount_amount: max_discount_amount !== undefined && max_discount_amount !== '' && max_discount_amount !== null ? Number(max_discount_amount) : null,
      },
    });

    res.status(201).json({ message: 'Coupon created successfully', data: coupon });
  } catch (error: any) {
    console.error('Error creating coupon:', error);

    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }

    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

// ─── UPDATE COUPON ──────────────────────────────────────────────────────────
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_type,
      discount_value,
      is_active,
      valid_from,
      valid_until,
      max_uses,
      min_order_amount,
      applicable_to,
      applicable_course_ids,
      applicable_test_series_ids,
      applicable_activity_ids,
      max_discount_amount,
    } = req.body;

    const existing = await prisma.coupon.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const updateData: any = {};

    if (code !== undefined) {
      if (typeof code !== 'string' || !code.trim()) {
        return res.status(400).json({ error: 'Coupon code cannot be empty' });
      }
      updateData.code = code.trim().toUpperCase();
    }

    if (discount_type !== undefined) {
      if (!['PERCENTAGE', 'FLAT'].includes(discount_type)) {
        return res.status(400).json({ error: 'Discount type must be PERCENTAGE or FLAT' });
      }
      updateData.discount_type = discount_type;
    }

    if (discount_value !== undefined) {
      const parsedDiscountValue = Number(discount_value);
      if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
        return res.status(400).json({ error: 'Discount value must be greater than 0' });
      }
      const effectiveDiscountType = updateData.discount_type || existing.discount_type;
      if (effectiveDiscountType === 'PERCENTAGE' && parsedDiscountValue > 100) {
        return res.status(400).json({ error: 'Percentage discount cannot exceed 100' });
      }
      updateData.discount_value = parsedDiscountValue;
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    if (valid_from !== undefined) {
      if (valid_from === null || valid_from === '') {
        updateData.valid_from = null;
      } else {
        const parsedValidFrom = new Date(valid_from);
        if (Number.isNaN(parsedValidFrom.getTime())) {
          return res.status(400).json({ error: 'Invalid valid_from date' });
        }
        updateData.valid_from = parsedValidFrom;
      }
    }

    if (valid_until !== undefined) {
      if (valid_until === null || valid_until === '') {
        updateData.valid_until = null;
      } else {
        const parsedValidUntil = new Date(valid_until);
        if (Number.isNaN(parsedValidUntil.getTime())) {
          return res.status(400).json({ error: 'Invalid valid_until date' });
        }
        updateData.valid_until = parsedValidUntil;
      }
    }

    const effectiveValidFrom = updateData.valid_from !== undefined ? updateData.valid_from : existing.valid_from;
    const effectiveValidUntil = updateData.valid_until !== undefined ? updateData.valid_until : existing.valid_until;

    if (effectiveValidFrom && effectiveValidUntil && effectiveValidFrom > effectiveValidUntil) {
      return res.status(400).json({ error: 'valid_until must be after valid_from' });
    }

    if (max_uses !== undefined) {
      if (max_uses === null || max_uses === '') {
        updateData.max_uses = null;
      } else {
        const parsedMaxUses = Number(max_uses);
        if (Number.isNaN(parsedMaxUses) || parsedMaxUses <= 0) {
          return res.status(400).json({ error: 'Max uses must be greater than 0' });
        }
        if (parsedMaxUses < existing.used_count) {
          return res.status(400).json({ error: 'Max uses cannot be less than used count' });
        }
        updateData.max_uses = parsedMaxUses;
      }
    }

    if (min_order_amount !== undefined) {
      updateData.min_order_amount = min_order_amount !== null && min_order_amount !== '' ? Number(min_order_amount) : null;
    }

    if (applicable_to !== undefined) {
      updateData.applicable_to = applicable_to;
    }

    if (applicable_course_ids !== undefined) {
      updateData.applicable_course_ids = Array.isArray(applicable_course_ids) ? applicable_course_ids : [];
    }

    if (applicable_test_series_ids !== undefined) {
      updateData.applicable_test_series_ids = Array.isArray(applicable_test_series_ids) ? applicable_test_series_ids : [];
    }

    if (applicable_activity_ids !== undefined) {
      updateData.applicable_activity_ids = Array.isArray(applicable_activity_ids) ? applicable_activity_ids : [];
    }

    if (max_discount_amount !== undefined) {
      updateData.max_discount_amount = max_discount_amount !== null && max_discount_amount !== '' ? Number(max_discount_amount) : null;
    }

    const coupon = await prisma.coupon.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({ message: 'Coupon updated successfully', data: coupon });
  } catch (error: any) {
    console.error('Error updating coupon:', error);

    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }

    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

// ─── DELETE COUPON ──────────────────────────────────────────────────────────
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.coupon.delete({ where: { id: Number(id) } });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);

    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};

// ─── VALIDATE COUPON (FOR CHECKOUT, ENQUIRIES, INVOICES) ─────────────────────
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, item_type, item_id, order_amount } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ isValid: false, error: 'Coupon code is required' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      return res.status(404).json({ isValid: false, error: 'Invalid coupon code' });
    }

    if (!coupon.is_active) {
      return res.status(400).json({ isValid: false, error: 'This coupon is inactive' });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({ isValid: false, error: 'This coupon is not yet valid' });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({ isValid: false, error: 'This coupon has expired' });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ isValid: false, error: 'Coupon usage limit has been reached' });
    }

    const parsedOrderAmount = Number(order_amount || 0);

    // Minimum order amount threshold check
    if (coupon.min_order_amount !== null && parsedOrderAmount < coupon.min_order_amount) {
      return res.status(400).json({
        isValid: false,
        error: `Coupon is valid only for orders of ₹${coupon.min_order_amount} or more`,
        min_order_amount: coupon.min_order_amount,
      });
    }

    // Check item category applicability
    if (coupon.applicable_to && coupon.applicable_to !== 'ALL' && item_type) {
      if (coupon.applicable_to === 'COURSE' && item_type !== 'COURSE' && item_type !== 'SUBJECT') {
        return res.status(400).json({ isValid: false, error: 'Coupon is applicable only to Courses & Subjects' });
      }
      if (coupon.applicable_to === 'TEST_SERIES' && item_type !== 'TEST_SERIES') {
        return res.status(400).json({ isValid: false, error: 'Coupon is applicable only to Test Series' });
      }
      if (coupon.applicable_to === 'ACTIVITY_GROUP' && item_type !== 'ACTIVITY_GROUP') {
        return res.status(400).json({ isValid: false, error: 'Coupon is applicable only to Activity Groups' });
      }
    }

    // Check specific item ID scope if configured
    if (item_id && coupon.applicable_to !== 'ALL') {
      const numericId = Number(item_id);
      if (
        (item_type === 'COURSE' || item_type === 'SUBJECT') &&
        Array.isArray(coupon.applicable_course_ids) &&
        coupon.applicable_course_ids.length > 0 &&
        !coupon.applicable_course_ids.includes(numericId)
      ) {
        return res.status(400).json({ isValid: false, error: 'Coupon is not valid for this specific course' });
      }
      if (
        item_type === 'TEST_SERIES' &&
        Array.isArray(coupon.applicable_test_series_ids) &&
        coupon.applicable_test_series_ids.length > 0 &&
        !coupon.applicable_test_series_ids.includes(numericId)
      ) {
        return res.status(400).json({ isValid: false, error: 'Coupon is not valid for this specific test series' });
      }
      if (
        item_type === 'ACTIVITY_GROUP' &&
        Array.isArray(coupon.applicable_activity_ids) &&
        coupon.applicable_activity_ids.length > 0 &&
        !coupon.applicable_activity_ids.includes(numericId)
      ) {
        return res.status(400).json({ isValid: false, error: 'Coupon is not valid for this specific activity group' });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (parsedOrderAmount > 0) {
      if (coupon.discount_type === 'PERCENTAGE') {
        discountAmount = (parsedOrderAmount * coupon.discount_value) / 100;
        if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
          discountAmount = coupon.max_discount_amount;
        }
      } else {
        discountAmount = Math.min(coupon.discount_value, parsedOrderAmount);
      }
    }

    const finalAmount = Math.max(0, parsedOrderAmount - discountAmount);

    res.json({
      isValid: true,
      message: 'Coupon applied successfully',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: Math.round(discountAmount * 100) / 100,
      order_amount: parsedOrderAmount,
      final_amount: Math.round(finalAmount * 100) / 100,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount,
        applicable_to: coupon.applicable_to,
      },
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ isValid: false, error: 'Failed to validate coupon' });
  }
};
