import type { Request, Response } from 'express';
import { PrismaClient, InvoiceStatus, EnrollmentType } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { sendInvoiceEmailNotification } from '../services/email.service.js';
import { sendEnrollmentNotification } from '../services/notification.service.js';
import { generateInvoiceNumber } from '../utils/payment.utils.js';

const prisma = new PrismaClient();

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { search, status, student_id, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const where: any = {};
    const now = new Date();

    if (student_id) {
      where.student_id = parseInt(student_id as string, 10);
    }

    // Status filtering including dynamic overdue
    if (status && status !== 'all') {
      const statusLower = (status as string).toLowerCase();
      if (statusLower === 'paid') {
        where.status = InvoiceStatus.PAID;
      } else if (statusLower === 'pending') {
        where.status = InvoiceStatus.PENDING;
        where.due_date = { gte: now };
      } else if (statusLower === 'overdue') {
        where.status = InvoiceStatus.PENDING;
        where.due_date = { lt: now };
      } else if (statusLower === 'cancelled') {
        where.status = InvoiceStatus.CANCELLED;
      }
    }

    // Search query across student name, email, invoice number, notes, and items
    if (search && (search as string).trim() !== '') {
      const searchStr = (search as string).trim();
      where.OR = [
        {
          invoice_number: {
            contains: searchStr,
            mode: 'insensitive',
          },
        },
        {
          student: {
            user: {
              OR: [
                { name: { contains: searchStr, mode: 'insensitive' } },
                { email: { contains: searchStr, mode: 'insensitive' } },
                { phone: { contains: searchStr, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          items: {
            some: {
              item_name: {
                contains: searchStr,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    // Determine order
    const orderBy: any = {};
    if (sortBy === 'due_date') {
      orderBy.due_date = sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'total_amount') {
      orderBy.total_amount = sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'invoice_number') {
      orderBy.invoice_number = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.created_at = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const [invoices, total, allInvoicesStats] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              class: { select: { id: true, name: true } },
              board: { select: { id: true, name: true } },
            },
          },
          items: {
            include: {
              subject: { select: { id: true, name: true, price: true, actual_price: true } },
              test_series: { select: { id: true, title: true, price: true } },
              activity_group: { select: { id: true, name: true, price: true } },
            },
          },
        },
        orderBy,
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        select: {
          id: true,
          status: true,
          due_date: true,
          total_amount: true,
        },
      }),
    ]);

    // Format invoices with dynamic overdue status indicator
    const formattedInvoices = invoices.map((inv) => {
      const isOverdue = inv.status === InvoiceStatus.PENDING && new Date(inv.due_date) < now;
      const displayStatus = isOverdue ? 'OVERDUE' : inv.status;

      return {
        ...inv,
        display_status: displayStatus,
        is_overdue: isOverdue,
      };
    });

    // Compute stats for top summary cards
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    allInvoicesStats.forEach((inv) => {
      totalInvoiced += inv.total_amount || 0;
      if (inv.status === InvoiceStatus.PAID) {
        totalPaid += inv.total_amount || 0;
      } else if (inv.status === InvoiceStatus.PENDING) {
        if (new Date(inv.due_date) < now) {
          totalOverdue += inv.total_amount || 0;
        } else {
          totalPending += inv.total_amount || 0;
        }
      }
    });

    const paginatedResponse = createPaginatedResponse(formattedInvoices, total, page, limit);

    sendSuccess(res, {
      ...paginatedResponse,
      stats: {
        totalInvoiced,
        totalPaid,
        totalPending,
        totalOverdue,
        totalCount: allInvoicesStats.length,
      },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isNum = !isNaN(Number(id));

    const invoice = await prisma.invoice.findFirst({
      where: isNum ? { id: parseInt(id!, 10) } : { invoice_number: String(id) },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            class: true,
            board: true,
          },
        },
        items: {
          include: {
            subject: true,
            test_series: true,
            activity_group: true,
          },
        },
        enrollments: true,
      },
    });

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const now = new Date();
    const isOverdue = invoice.status === InvoiceStatus.PENDING && new Date(invoice.due_date) < now;

    sendSuccess(res, {
      ...invoice,
      display_status: isOverdue ? 'OVERDUE' : invoice.status,
      is_overdue: isOverdue,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      due_date,
      issue_date,
      items,
      discount_amount = 0,
      notes,
      payment_method,
      transaction_id,
      status = 'PENDING',
      paid_date,
      send_email = false,
    } = req.body;

    if (!student_id) {
      return sendError(res, 'Student is required', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one item must be included in the invoice', 400);
    }

    const student = await prisma.student.findUnique({
      where: { id: parseInt(student_id, 10) },
      include: { user: true },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Calculate subtotal and prepare items
    let subtotal = 0;
    const preparedItems: any[] = [];

    for (const item of items) {
      let itemName = item.item_name || '';
      let unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
      let actualPrice = item.actual_price || unitPrice;
      const type = (item.type as EnrollmentType) || EnrollmentType.SUBJECT;
      const quantity = item.quantity || 1;
      const discount = item.discount || 0;

      // Fetch snapshot from DB if name/price missing
      if (type === 'SUBJECT' && item.subject_id) {
        const sub = await prisma.subject.findUnique({ where: { id: item.subject_id } });
        if (sub) {
          itemName = itemName || sub.name;
          unitPrice = unitPrice || sub.price || 0;
          actualPrice = actualPrice || sub.actual_price || sub.price || 0;
        }
      } else if (type === 'TEST_SERIES' && item.test_series_id) {
        const ts = await prisma.testSeries.findUnique({ where: { id: item.test_series_id } });
        if (ts) {
          itemName = itemName || ts.title;
          unitPrice = unitPrice || ts.price || 0;
          actualPrice = actualPrice || ts.price || 0;
        }
      } else if (type === 'ACTIVITY_GROUP' && item.activity_group_id) {
        const ag = await prisma.activityGroup.findUnique({ where: { id: item.activity_group_id } });
        if (ag) {
          itemName = itemName || ag.name;
          unitPrice = unitPrice || ag.price || 0;
          actualPrice = actualPrice || ag.price || 0;
        }
      }

      const lineTotal = Math.max(0, unitPrice * quantity - discount);
      subtotal += lineTotal;

      preparedItems.push({
        type,
        subject_id: item.subject_id || null,
        test_series_id: item.test_series_id || null,
        activity_group_id: item.activity_group_id || null,
        item_name: itemName || 'Learning Item',
        unit_price: unitPrice,
        actual_price: actualPrice,
        quantity,
        discount,
        total: lineTotal,
      });
    }

    const total_amount = Math.max(0, subtotal - Number(discount_amount || 0));
    const invStatus = status === 'PAID' ? InvoiceStatus.PAID : InvoiceStatus.PENDING;

    // Create Invoice and Invoice Items
    let invoice: any;
    let attempts = 0;
    while (attempts < 5) {
      try {
        const invoice_number = await generateInvoiceNumber();
        invoice = await prisma.invoice.create({
          data: {
            invoice_number,
            student_id: student.id,
            status: invStatus,
            issue_date: issue_date ? new Date(issue_date) : new Date(),
            due_date: due_date ? new Date(due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            paid_date: invStatus === InvoiceStatus.PAID ? (paid_date ? new Date(paid_date) : new Date()) : null,
            subtotal,
            discount_amount: Number(discount_amount || 0),
            total_amount,
            notes: notes || null,
            payment_method: payment_method || null,
            transaction_id: transaction_id || null,
            items: {
              create: preparedItems,
            },
          },
          include: {
            student: {
              include: {
                user: true,
                class: true,
                board: true,
              },
            },
            items: true,
          },
        });
        break;
      } catch (createErr: any) {
        if (createErr.code === 'P2002' || createErr.message?.includes('Unique constraint') || createErr.message?.includes('invoice_number')) {
          attempts++;
          if (attempts >= 5) throw createErr;
          continue;
        }
        throw createErr;
      }
    }

    // Create / link student Enrollments for each item
    for (const item of preparedItems) {
      try {
        if (item.type === 'SUBJECT' && item.subject_id) {
          const existing = await prisma.enrollment.findFirst({
            where: { student_id: student.id, subject_id: item.subject_id },
          });
          if (existing) {
            await prisma.enrollment.update({
              where: { id: existing.id },
              data: { invoice_id: invoice.id, price: item.unit_price },
            });
          } else {
            await prisma.enrollment.create({
              data: {
                student_id: student.id,
                subject_id: item.subject_id,
                type: 'SUBJECT',
                price: item.unit_price,
                invoice_id: invoice.id,
              },
            });
            const sub = await prisma.subject.findUnique({ where: { id: item.subject_id } });
            if (sub) {
              sendEnrollmentNotification(student.id, sub.is_course ? 'Course' : 'Subject', sub.name).catch(console.error);
            }
          }
        } else if (item.type === 'TEST_SERIES' && item.test_series_id) {
          const existing = await prisma.enrollment.findFirst({
            where: { student_id: student.id, test_series_id: item.test_series_id },
          });
          if (existing) {
            await prisma.enrollment.update({
              where: { id: existing.id },
              data: { invoice_id: invoice.id, price: item.unit_price },
            });
          } else {
            await prisma.enrollment.create({
              data: {
                student_id: student.id,
                test_series_id: item.test_series_id,
                type: 'TEST_SERIES',
                price: item.unit_price,
                invoice_id: invoice.id,
              },
            });
            const ts = await prisma.testSeries.findUnique({ where: { id: item.test_series_id } });
            if (ts) {
              sendEnrollmentNotification(student.id, 'Test Series', ts.title).catch(console.error);
            }
          }
        } else if (item.type === 'ACTIVITY_GROUP' && item.activity_group_id) {
          const existing = await prisma.enrollment.findFirst({
            where: { student_id: student.id, activity_group_id: item.activity_group_id },
          });
          if (existing) {
            await prisma.enrollment.update({
              where: { id: existing.id },
              data: { invoice_id: invoice.id, price: item.unit_price },
            });
          } else {
            await prisma.enrollment.create({
              data: {
                student_id: student.id,
                activity_group_id: item.activity_group_id,
                type: 'ACTIVITY_GROUP',
                price: item.unit_price,
                invoice_id: invoice.id,
              },
            });
          }

          // Sync activity enrollments for published activities
          const ag = await prisma.activityGroup.findUnique({
            where: { id: item.activity_group_id },
            include: { activities: { where: { is_published: true } } },
          });
          if (ag) {
            for (const act of ag.activities) {
              await prisma.activityEnrollment.upsert({
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
              }).catch(console.error);
            }
            if (!existing) {
              sendEnrollmentNotification(student.id, 'Activity Group', ag.name).catch(console.error);
            }
          }
        }
      } catch (enrollErr) {
        console.warn('Enrollment creation notice:', enrollErr);
      }
    }

    // Optionally send email notification immediately
    if (send_email && student.user.email) {
      sendInvoiceEmailNotification(student.user.email, student.user.name, {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        status: invoice.status,
        subtotal: invoice.subtotal,
        discount_amount: invoice.discount_amount,
        total_amount: invoice.total_amount,
        items: invoice.items.map((i: any) => ({
          item_name: i.item_name,
          type: i.type,
          unit_price: i.unit_price,
          quantity: i.quantity,
          discount: i.discount,
          total: i.total,
        })),
        notes: invoice.notes,
      }).catch(console.error);
    }

    sendSuccess(res, invoice, 'Invoice and enrollments created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id!, 10);
    if (isNaN(invoiceId)) {
      return sendError(res, 'Invalid invoice ID', 400);
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!existingInvoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const {
      student_id,
      due_date,
      issue_date,
      status,
      paid_date,
      discount_amount,
      notes,
      payment_method,
      transaction_id,
      items,
    } = req.body;

    const updateData: any = {};

    if (student_id !== undefined) updateData.student_id = parseInt(student_id, 10);
    if (due_date !== undefined) updateData.due_date = new Date(due_date);
    if (issue_date !== undefined) updateData.issue_date = new Date(issue_date);
    if (discount_amount !== undefined) updateData.discount_amount = Number(discount_amount);
    if (notes !== undefined) updateData.notes = notes;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (transaction_id !== undefined) updateData.transaction_id = transaction_id;

    if (status !== undefined) {
      updateData.status = status === 'PAID' ? InvoiceStatus.PAID : InvoiceStatus.PENDING;
      if (status === 'PAID') {
        updateData.paid_date = paid_date ? new Date(paid_date) : new Date();
      } else {
        updateData.paid_date = null;
      }
    }

    // If items are being replaced or updated
    if (items && Array.isArray(items)) {
      let subtotal = 0;
      const preparedItems: any[] = [];

      for (const item of items) {
        const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
        const actualPrice = item.actual_price || unitPrice;
        const type = (item.type as EnrollmentType) || EnrollmentType.SUBJECT;
        const quantity = item.quantity || 1;
        const discount = item.discount || 0;
        const lineTotal = Math.max(0, unitPrice * quantity - discount);
        subtotal += lineTotal;

        preparedItems.push({
          type,
          subject_id: item.subject_id || null,
          test_series_id: item.test_series_id || null,
          activity_group_id: item.activity_group_id || null,
          item_name: item.item_name || 'Learning Item',
          unit_price: unitPrice,
          actual_price: actualPrice,
          quantity,
          discount,
          total: lineTotal,
        });
      }

      updateData.subtotal = subtotal;
      const finalDiscount = discount_amount !== undefined ? Number(discount_amount) : existingInvoice.discount_amount;
      updateData.total_amount = Math.max(0, subtotal - finalDiscount);

      // Replace invoice items in a transaction
      await prisma.invoiceItem.deleteMany({
        where: { invoice_id: invoiceId },
      });

      await prisma.invoiceItem.createMany({
        data: preparedItems.map((pi) => ({
          ...pi,
          invoice_id: invoiceId,
        })),
      });
    } else if (discount_amount !== undefined) {
      updateData.total_amount = Math.max(0, existingInvoice.subtotal - Number(discount_amount));
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        student: {
          include: {
            user: true,
            class: true,
            board: true,
          },
        },
        items: {
          include: {
            subject: true,
            test_series: true,
            activity_group: true,
          },
        },
      },
    });

    sendSuccess(res, updatedInvoice, 'Invoice updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const markInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paid_date, payment_method } = req.body;
    const invoiceId = parseInt(id!, 10);
    if (isNaN(invoiceId)) {
      return sendError(res, 'Invalid invoice ID', 400);
    }

    const isPaid = status === 'PAID';

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
        paid_date: isPaid ? (paid_date ? new Date(paid_date) : new Date()) : null,
        payment_method: payment_method || undefined,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        items: true,
      },
    });

    sendSuccess(res, updated, `Invoice marked as ${isPaid ? 'PAID' : 'PENDING'}`);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const sendInvoiceEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id!, 10);
    if (isNaN(invoiceId)) {
      return sendError(res, 'Invalid invoice ID', 400);
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        items: true,
      },
    });

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const studentEmail = invoice.student?.user?.email;
    const studentName = invoice.student?.user?.name || 'Student';

    if (!studentEmail) {
      return sendError(res, 'Student does not have a registered email address', 400);
    }

    const emailSent = await sendInvoiceEmailNotification(studentEmail, studentName, {
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status,
      subtotal: invoice.subtotal,
      discount_amount: invoice.discount_amount,
      total_amount: invoice.total_amount,
      items: invoice.items.map((i) => ({
        item_name: i.item_name,
        type: i.type,
        unit_price: i.unit_price,
        quantity: i.quantity,
        discount: i.discount,
        total: i.total,
      })),
      notes: invoice.notes,
    });

    if (!emailSent) {
      return sendError(res, 'Failed to send invoice email via SMTP server', 500);
    }

    sendSuccess(res, { sent_to: studentEmail }, 'Invoice email dispatched to student successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id!, 10);
    if (isNaN(invoiceId)) {
      return sendError(res, 'Invalid invoice ID', 400);
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    sendSuccess(res, null, 'Invoice deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getInvoiceSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.invoiceSetting.findFirst();
    if (!settings) {
      settings = await prisma.invoiceSetting.create({
        data: {
          business_name: 'StudyAsan Academy',
          address: 'Jawahar jyoti , damuadhunga, behind hydil Devkhadi, Kathgodam, Haldwani, Bamori Malli, Uttarakhand 263126',
          email: 'contact@studyasan.com',
          phone: '',
          website: 'www.studyasan.com',
          include_gst: false,
          gst_percentage: 18,
          gst_number: '',
          bank_name: '',
          account_number: '',
          account_holder_name: '',
          ifsc_code: '',
          branch_name: '',
          upi_id: '',
          upi_name: '',
        },
      });
    }
    sendSuccess(res, settings);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateInvoiceSettings = async (req: Request, res: Response) => {
  try {
    const {
      business_name,
      address,
      email,
      phone,
      website,
      include_gst,
      gst_percentage,
      gst_number,
      bank_name,
      account_number,
      account_holder_name,
      ifsc_code,
      branch_name,
      upi_id,
      upi_name,
    } = req.body;

    let settings = await prisma.invoiceSetting.findFirst();
    if (!settings) {
      settings = await prisma.invoiceSetting.create({
        data: {
          business_name: business_name || 'StudyAsan Academy',
          address: address || '',
          email: email || 'contact@studyasan.com',
          phone: phone || '',
          website: website || 'www.studyasan.com',
          include_gst: Boolean(include_gst),
          gst_percentage: Number(gst_percentage) || 18,
          gst_number: gst_number || '',
          bank_name: bank_name || '',
          account_number: account_number || '',
          account_holder_name: account_holder_name || '',
          ifsc_code: ifsc_code || '',
          branch_name: branch_name || '',
          upi_id: upi_id || '',
          upi_name: upi_name || '',
        },
      });
    } else {
      settings = await prisma.invoiceSetting.update({
        where: { id: settings.id },
        data: {
          business_name: business_name !== undefined ? business_name : settings.business_name,
          address: address !== undefined ? address : settings.address,
          email: email !== undefined ? email : settings.email,
          phone: phone !== undefined ? phone : settings.phone,
          website: website !== undefined ? website : settings.website,
          include_gst: include_gst !== undefined ? Boolean(include_gst) : settings.include_gst,
          gst_percentage: gst_percentage !== undefined ? Number(gst_percentage) : settings.gst_percentage,
          gst_number: gst_number !== undefined ? gst_number : settings.gst_number,
          bank_name: bank_name !== undefined ? bank_name : settings.bank_name,
          account_number: account_number !== undefined ? account_number : settings.account_number,
          account_holder_name: account_holder_name !== undefined ? account_holder_name : settings.account_holder_name,
          ifsc_code: ifsc_code !== undefined ? ifsc_code : settings.ifsc_code,
          branch_name: branch_name !== undefined ? branch_name : settings.branch_name,
          upi_id: upi_id !== undefined ? upi_id : settings.upi_id,
          upi_name: upi_name !== undefined ? upi_name : settings.upi_name,
        },
      });
    }
    sendSuccess(res, settings, 'Invoice settings updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

