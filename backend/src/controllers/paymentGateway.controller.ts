import type { Request, Response } from 'express';
import { PrismaClient, EnrollmentType, InvoiceStatus } from '@prisma/client';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { sendSuccess, sendError } from '../utils/response.js';
import { generateInvoiceNumber, generateReceiptNumber } from '../utils/payment.utils.js';
import { sendNotificationAllChannels, sendEnrollmentNotification } from '../services/notification.service.js';
import { sendInvoiceEmailNotification } from '../services/email.service.js';
import { processReferralCommissionForPayment } from './agency.controller.js';

const prisma = new PrismaClient();

// Helper to get or create default Payment Gateway Settings
export async function getOrCreateGatewaySettings() {
  let settings = await prisma.paymentGatewaySetting.findFirst();
  if (!settings) {
    settings = await prisma.paymentGatewaySetting.create({
      data: {
        provider: 'RAZORPAY',
        is_enabled: false,
        enable_for_courses: true,
        enable_for_test_series: true,
        enable_for_activities: true,
        key_id: process.env.RAZORPAY_KEY_ID || '',
        key_secret: process.env.RAZORPAY_KEY_SECRET || '',
        webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
        currency: 'INR',
        theme_color: '#0276D3',
        institute_name: 'StudyAsan Academy',
      },
    });
  }
  return settings;
}

// ─── 1. PUBLIC CONFIG (SAFE TO EXPOSE TO FRONTEND) ───────────────────────────
export const getPublicGatewayConfig = async (_req: Request, res: Response) => {
  try {
    const settings = await getOrCreateGatewaySettings();
    sendSuccess(res, {
      is_enabled: settings.is_enabled,
      key_id: settings.key_id,
      currency: settings.currency,
      enable_for_courses: settings.enable_for_courses,
      enable_for_test_series: settings.enable_for_test_series,
      enable_for_activities: settings.enable_for_activities,
      institute_name: settings.institute_name,
      theme_color: settings.theme_color,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── 2. ADMIN GET FULL SETTINGS (WITH SECRET KEYS) ───────────────────────────
export const getAdminGatewaySettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getOrCreateGatewaySettings();
    sendSuccess(res, settings);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── 3. ADMIN UPDATE SETTINGS ────────────────────────────────────────────────
export const updateGatewaySettings = async (req: Request, res: Response) => {
  try {
    const {
      is_enabled,
      enable_for_courses,
      enable_for_test_series,
      enable_for_activities,
      key_id,
      key_secret,
      webhook_secret,
      currency,
      theme_color,
      institute_name,
    } = req.body;

    let settings = await prisma.paymentGatewaySetting.findFirst();
    if (!settings) {
      settings = await prisma.paymentGatewaySetting.create({
        data: {
          provider: 'RAZORPAY',
          is_enabled: Boolean(is_enabled),
          enable_for_courses: enable_for_courses !== undefined ? Boolean(enable_for_courses) : true,
          enable_for_test_series: enable_for_test_series !== undefined ? Boolean(enable_for_test_series) : true,
          enable_for_activities: enable_for_activities !== undefined ? Boolean(enable_for_activities) : true,
          key_id: key_id !== undefined ? String(key_id).trim() : '',
          key_secret: key_secret !== undefined ? String(key_secret).trim() : '',
          webhook_secret: webhook_secret !== undefined ? String(webhook_secret).trim() : '',
          currency: currency || 'INR',
          theme_color: theme_color || '#0276D3',
          institute_name: institute_name || 'StudyAsan Academy',
        },
      });
    } else {
      settings = await prisma.paymentGatewaySetting.update({
        where: { id: settings.id },
        data: {
          ...(is_enabled !== undefined && { is_enabled: Boolean(is_enabled) }),
          ...(enable_for_courses !== undefined && { enable_for_courses: Boolean(enable_for_courses) }),
          ...(enable_for_test_series !== undefined && { enable_for_test_series: Boolean(enable_for_test_series) }),
          ...(enable_for_activities !== undefined && { enable_for_activities: Boolean(enable_for_activities) }),
          ...(key_id !== undefined && { key_id: String(key_id).trim() }),
          ...(key_secret !== undefined && { key_secret: String(key_secret).trim() }),
          ...(webhook_secret !== undefined && { webhook_secret: String(webhook_secret).trim() }),
          ...(currency !== undefined && { currency }),
          ...(theme_color !== undefined && { theme_color }),
          ...(institute_name !== undefined && { institute_name }),
        },
      });
    }

    sendSuccess(res, settings, 'Payment gateway settings updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── 4. CREATE RAZORPAY ORDER (ONLINE EXPLORE CHECKOUT) ──────────────────────
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { item_type, item_id, coupon_code } = req.body;
    const userId = (req as any).user?.id;

    if (!item_type || !item_id) {
      return sendError(res, 'item_type and item_id are required', 400);
    }

    const settings = await getOrCreateGatewaySettings();
    if (!settings.is_enabled) {
      return sendError(res, 'Online payment gateway is currently disabled. Please contact administration.', 400);
    }

    if (!settings.key_id || !settings.key_secret) {
      return sendError(res, 'Razorpay credentials are not configured.', 400);
    }

    // Check category specific toggle
    if (item_type === 'COURSE' || item_type === 'SUBJECT') {
      if (!settings.enable_for_courses) {
        return sendError(res, 'Online payments for Courses & Subjects are currently disabled.', 400);
      }
    } else if (item_type === 'TEST_SERIES') {
      if (!settings.enable_for_test_series) {
        return sendError(res, 'Online payments for Test Series are currently disabled.', 400);
      }
    } else if (item_type === 'ACTIVITY_GROUP') {
      if (!settings.enable_for_activities) {
        return sendError(res, 'Online payments for Activity Groups are currently disabled.', 400);
      }
    }

    // Fetch Item details
    let itemName = '';
    let unitPrice = 0;
    let actualPrice = 0;

    if (item_type === 'COURSE' || item_type === 'SUBJECT') {
      const subject = await prisma.subject.findUnique({ where: { id: Number(item_id) } });
      if (!subject) return sendError(res, 'Subject/Course not found', 404);
      itemName = subject.name;
      unitPrice = subject.price ?? 0;
      actualPrice = subject.actual_price ?? unitPrice;
    } else if (item_type === 'TEST_SERIES') {
      const ts = await prisma.testSeries.findUnique({ where: { id: Number(item_id) } });
      if (!ts) return sendError(res, 'Test Series not found', 404);
      itemName = ts.title;
      unitPrice = ts.price ?? 0;
      actualPrice = ts.actual_price ?? unitPrice;
    } else if (item_type === 'ACTIVITY_GROUP') {
      const ag = await prisma.activityGroup.findUnique({ where: { id: Number(item_id) } });
      if (!ag) return sendError(res, 'Activity Group not found', 404);
      itemName = ag.name;
      unitPrice = ag.price ?? 0;
      actualPrice = ag.actual_price ?? unitPrice;
    } else {
      return sendError(res, 'Invalid item type', 400);
    }

    if (unitPrice <= 0) {
      return sendSuccess(res, {
        is_free: true,
        item_name: itemName,
        amount: 0,
      });
    }

    // Calculate coupon discount if provided
    let discountAmount = 0;
    let validatedCoupon: any = null;

    if (coupon_code && typeof coupon_code === 'string' && coupon_code.trim()) {
      const code = coupon_code.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({ where: { code } });

      if (coupon && coupon.is_active) {
        const now = new Date();
        const validDates = (!coupon.valid_from || coupon.valid_from <= now) && (!coupon.valid_until || coupon.valid_until >= now);
        const validUsage = coupon.max_uses === null || coupon.used_count < coupon.max_uses;
        const validMinAmount = coupon.min_order_amount === null || unitPrice >= coupon.min_order_amount;

        // Check scope
        let scopeMatches = true;
        if (coupon.applicable_to && coupon.applicable_to !== 'ALL') {
          if (coupon.applicable_to === 'COURSE' && item_type !== 'COURSE' && item_type !== 'SUBJECT') scopeMatches = false;
          if (coupon.applicable_to === 'TEST_SERIES' && item_type !== 'TEST_SERIES') scopeMatches = false;
          if (coupon.applicable_to === 'ACTIVITY_GROUP' && item_type !== 'ACTIVITY_GROUP') scopeMatches = false;
        }

        if (validDates && validUsage && validMinAmount && scopeMatches) {
          if (coupon.discount_type === 'PERCENTAGE') {
            discountAmount = (unitPrice * coupon.discount_value) / 100;
            if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
              discountAmount = coupon.max_discount_amount;
            }
          } else {
            discountAmount = Math.min(coupon.discount_value, unitPrice);
          }
          validatedCoupon = coupon;
        }
      }
    }

    const finalAmount = Math.max(0, unitPrice - discountAmount);

    if (finalAmount <= 0) {
      return sendSuccess(res, {
        is_free: true,
        item_name: itemName,
        amount: 0,
        discount_amount: discountAmount,
      });
    }

    // Initialize Razorpay SDK instance
    const razorpay = new Razorpay({
      key_id: settings.key_id,
      key_secret: settings.key_secret,
    });

    const receiptSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderOptions = {
      amount: Math.round(finalAmount * 100), // amount in paise
      currency: settings.currency || 'INR',
      receipt: `rcpt_${item_id}_${receiptSuffix}`,
      notes: {
        item_type,
        item_id: String(item_id),
        item_name: itemName,
        user_id: String(userId || ''),
        coupon_code: validatedCoupon?.code || '',
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    sendSuccess(res, {
      order_id: order.id,
      amount: finalAmount,
      amount_in_paise: order.amount,
      currency: order.currency,
      key_id: settings.key_id,
      item_name: itemName,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      coupon_applied: validatedCoupon?.code || null,
      institute_name: settings.institute_name,
      theme_color: settings.theme_color,
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    sendError(res, error.message || 'Failed to create payment order', 500);
  }
};

// ─── 5. VERIFY RAZORPAY PAYMENT & FULFILL ENROLLMENT ─────────────────────────
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      item_type,
      item_id,
      coupon_code,
      student_name,
      student_email,
      student_phone,
    } = req.body;

    const currentUserId = (req as any).user?.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, 'Missing payment verification credentials', 400);
    }

    const settings = await getOrCreateGatewaySettings();
    if (!settings.key_secret) {
      return sendError(res, 'Razorpay key secret not configured on server', 500);
    }

    // Verify HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', settings.key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return sendError(res, 'Invalid payment signature verification failed', 400);
    }

    // Resolve student
    let student: any = null;
    if (currentUserId) {
      student = await prisma.student.findUnique({
        where: { user_id: currentUserId },
        include: { user: true, agency: true },
      });
    }

    if (!student && student_email) {
      const user = await prisma.user.findUnique({
        where: { email: student_email },
        include: { student: { include: { user: true, agency: true } } },
      });
      if (user?.student) {
        student = user.student;
      }
    }

    if (!student) {
      return sendError(res, 'Student account could not be resolved for fulfillment', 404);
    }

    // Fetch item details
    const numericItemId = Number(item_id);
    let itemName = '';
    let unitPrice = 0;
    let actualPrice = 0;
    const enrollmentType: EnrollmentType =
      item_type === 'TEST_SERIES'
        ? EnrollmentType.TEST_SERIES
        : item_type === 'ACTIVITY_GROUP'
        ? EnrollmentType.ACTIVITY_GROUP
        : EnrollmentType.SUBJECT;

    if (enrollmentType === 'SUBJECT') {
      const sub = await prisma.subject.findUnique({ where: { id: numericItemId } });
      if (!sub) return sendError(res, 'Subject not found', 404);
      itemName = sub.name;
      unitPrice = sub.price ?? 0;
      actualPrice = sub.actual_price ?? unitPrice;
    } else if (enrollmentType === 'TEST_SERIES') {
      const ts = await prisma.testSeries.findUnique({ where: { id: numericItemId } });
      if (!ts) return sendError(res, 'Test Series not found', 404);
      itemName = ts.title;
      unitPrice = ts.price ?? 0;
      actualPrice = ts.actual_price ?? unitPrice;
    } else if (enrollmentType === 'ACTIVITY_GROUP') {
      const ag = await prisma.activityGroup.findUnique({
        where: { id: numericItemId },
        include: { activities: { where: { is_published: true } } },
      });
      if (!ag) return sendError(res, 'Activity Group not found', 404);
      itemName = ag.name;
      unitPrice = ag.price ?? 0;
      actualPrice = ag.actual_price ?? unitPrice;
    }

    // Process coupon discount if applicable
    let discountAmount = 0;
    if (coupon_code && typeof coupon_code === 'string') {
      const code = coupon_code.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({ where: { code } });
      if (coupon && coupon.is_active) {
        if (coupon.discount_type === 'PERCENTAGE') {
          discountAmount = (unitPrice * coupon.discount_value) / 100;
          if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
            discountAmount = coupon.max_discount_amount;
          }
        } else {
          discountAmount = Math.min(coupon.discount_value, unitPrice);
        }

        // Increment usage count
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { used_count: { increment: 1 } },
        }).catch(console.error);
      }
    }

    const finalAmount = Math.max(0, unitPrice - discountAmount);
    const now = new Date();

    // Generate Invoice Number & Receipt Number
    const invoiceNumber = await generateInvoiceNumber();
    const receiptNumber = await generateReceiptNumber();

    // Perform database transactions to create Invoice, Enrollments, Payment
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or Update Enrollment
      let enrollment: any;
      if (enrollmentType === 'SUBJECT') {
        enrollment = await tx.enrollment.upsert({
          where: {
            student_id_subject_id: {
              student_id: student.id,
              subject_id: numericItemId,
            },
          },
          create: {
            student_id: student.id,
            subject_id: numericItemId,
            type: EnrollmentType.SUBJECT,
            price: finalAmount,
          },
          update: {
            price: finalAmount,
          },
        });
      } else if (enrollmentType === 'TEST_SERIES') {
        enrollment = await tx.enrollment.upsert({
          where: {
            student_id_test_series_id: {
              student_id: student.id,
              test_series_id: numericItemId,
            },
          },
          create: {
            student_id: student.id,
            test_series_id: numericItemId,
            type: EnrollmentType.TEST_SERIES,
            price: finalAmount,
          },
          update: {
            price: finalAmount,
          },
        });
      } else if (enrollmentType === 'ACTIVITY_GROUP') {
        enrollment = await tx.enrollment.upsert({
          where: {
            student_id_activity_group_id: {
              student_id: student.id,
              activity_group_id: numericItemId,
            },
          },
          create: {
            student_id: student.id,
            activity_group_id: numericItemId,
            type: EnrollmentType.ACTIVITY_GROUP,
            price: finalAmount,
          },
          update: {
            price: finalAmount,
          },
        });

        // Sync published activities for activity group
        const group = await tx.activityGroup.findUnique({
          where: { id: numericItemId },
          include: { activities: { where: { is_published: true } } },
        });

        if (group) {
          for (const act of group.activities) {
            await tx.activityEnrollment.upsert({
              where: {
                activity_id_student_id: {
                  activity_id: act.id,
                  student_id: student.id,
                },
              },
              create: {
                activity_id: act.id,
                student_id: student.id,
              },
              update: {},
            });
          }
        }
      }

      // 2. Create Invoice marked as PAID
      const invoice = await tx.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          student_id: student.id,
          status: InvoiceStatus.PAID,
          issue_date: now,
          due_date: now,
          paid_date: now,
          subtotal: unitPrice,
          discount_amount: discountAmount,
          total_amount: finalAmount,
          amount_paid: finalAmount,
          balance_due: 0,
          receipt_number: receiptNumber,
          payment_method: 'RAZORPAY',
          transaction_id: razorpay_payment_id,
          notes: `Paid online via Razorpay (Order: ${razorpay_order_id})`,
          items: {
            create: [
              {
                type: enrollmentType,
                subject_id: enrollmentType === 'SUBJECT' ? numericItemId : null,
                test_series_id: enrollmentType === 'TEST_SERIES' ? numericItemId : null,
                activity_group_id: enrollmentType === 'ACTIVITY_GROUP' ? numericItemId : null,
                item_name: itemName,
                unit_price: unitPrice,
                actual_price: actualPrice,
                quantity: 1,
                discount: discountAmount,
                total: finalAmount,
              },
            ],
          },
        },
        include: {
          student: { include: { user: true, class: true, board: true } },
          items: true,
        },
      });

      // Link enrollment to invoice
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { invoice_id: invoice.id },
      });

      // 3. Create Payment record
      const payment = await tx.payment.create({
        data: {
          enrollment_id: enrollment.id,
          type: enrollmentType,
          period: 'ONLINE_FULL',
          due_date: now,
          amount: finalAmount,
          amount_paid: finalAmount,
          is_paid: true,
          paid_date: now,
          payment_method: 'RAZORPAY',
          transaction_id: razorpay_payment_id,
          receipt_number: receiptNumber,
          notes: `Razorpay Order: ${razorpay_order_id}`,
        },
      });

      return { enrollment, invoice, payment };
    });

    // Process referral commission asynchronously
    processReferralCommissionForPayment(result.payment.id).catch(console.error);

    // Send notifications & receipt email
    sendEnrollmentNotification(student.id, item_type.replace('_', ' '), itemName).catch(console.error);
    await sendNotificationAllChannels({
      user_id: student.user_id,
      type: 'SUCCESS',
      title: `Payment Received: ${itemName}`,
      description: `Your payment of ₹${finalAmount} for ${itemName} has been confirmed. Receipt: ${receiptNumber}`,
    });

    if (student.user?.email) {
      sendInvoiceEmailNotification(student.user.email, student.user.name, {
        invoice_number: result.invoice.invoice_number,
        issue_date: result.invoice.issue_date,
        due_date: result.invoice.due_date,
        status: result.invoice.status,
        subtotal: result.invoice.subtotal,
        discount_amount: result.invoice.discount_amount,
        total_amount: result.invoice.total_amount,
        items: result.invoice.items.map((i: any) => ({
          item_name: i.item_name,
          type: i.type,
          unit_price: i.unit_price,
          quantity: i.quantity,
          discount: i.discount,
          total: i.total,
        })),
        notes: result.invoice.notes,
      }).catch(console.error);
    }

    sendSuccess(
      res,
      {
        enrollment_id: result.enrollment.id,
        invoice_id: result.invoice.id,
        invoice_number: result.invoice.invoice_number,
        receipt_number: receiptNumber,
        amount_paid: finalAmount,
        status: 'PAID',
      },
      'Payment verified and enrollment activated successfully!'
    );
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    sendError(res, error.message || 'Payment verification failed', 500);
  }
};
