import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllCoupons = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;

    const where: any = {};
    if (is_active !== undefined) {
      where.is_active = String(is_active) === 'true';
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    res.json({ data: coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

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
