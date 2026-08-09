import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Generate a unique referral code e.g. REF9832
 */
function generateReferralCode(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4) || 'REF';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${cleanName}${randomNum}`;
}

// ==================== PUBLIC REFERRAL HELPER ====================

/**
 * Validate a referral / reference code
 */
export const validateReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ valid: false, message: 'Referral code is required' });
            return;
        }

        const agency = await prisma.agency.findUnique({
            where: { referral_code: String(code).trim().toUpperCase() },
            select: { id: true, name: true, referral_code: true, is_active: true }
        });

        if (!agency || !agency.is_active) {
            res.status(404).json({ valid: false, message: 'Invalid or inactive referral code' });
            return;
        }

        res.json({
            valid: true,
            agency: {
                id: agency.id,
                name: agency.name,
                referral_code: agency.referral_code,
            }
        });
    } catch (error) {
        console.error('Error validating referral code:', error);
        res.status(500).json({ valid: false, message: 'Server error validating referral code' });
    }
};

// ==================== AGENCY AUTH ====================

/**
 * Agency Login
 */
export const agencyLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

        const agency = await prisma.agency.findUnique({
            where: { email: String(email).trim().toLowerCase() }
        });

        if (!agency) {
            res.status(401).json({ message: 'Invalid agency email or password' });
            return;
        }

        if (!agency.is_active) {
            res.status(403).json({ message: 'Agency account is inactive. Please contact Admin.' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, agency.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid agency email or password' });
            return;
        }

        // Generate token for agency
        const token = jsonwebtoken.sign(
            { id: agency.id, email: agency.email, role: 'AGENCY', agencyId: agency.id },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            agency: {
                id: agency.id,
                name: agency.name,
                email: agency.email,
                phone: agency.phone,
                referral_code: agency.referral_code,
                commission_type: agency.commission_type,
                commission_rate: agency.commission_rate,
                min_payout_limit: agency.min_payout_limit,
                points_balance: agency.points_balance,
                total_earnings: agency.total_earnings,
                paid_earnings: agency.paid_earnings,
            }
        });
    } catch (error) {
        console.error('Error in agencyLogin:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get authenticated Agency Profile
 */
export const getAgencyProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencyId = (req as any).user?.agencyId || (req as any).user?.id;
        if (!agencyId) {
            res.status(401).json({ message: 'Unauthorized agency session' });
            return;
        }

        const agency = await prisma.agency.findUnique({
            where: { id: Number(agencyId) },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                referral_code: true,
                commission_type: true,
                commission_rate: true,
                min_payout_limit: true,
                total_earnings: true,
                paid_earnings: true,
                points_balance: true,
                is_active: true,
                created_at: true,
            }
        });

        if (!agency) {
            res.status(404).json({ message: 'Agency not found' });
            return;
        }

        res.json(agency);
    } catch (error) {
        console.error('Error getting agency profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==================== ADMIN AGENCY MANAGEMENT ====================

/**
 * Admin: Create a new Referrer / Agency
 */
export const createAgency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, phone, password, referral_code, commission_type, commission_rate, min_payout_limit } = req.body;

        if (!name || !email || !phone || !password) {
            res.status(400).json({ message: 'Name, email, phone, and password are required' });
            return;
        }

        const existingEmail = await prisma.agency.findUnique({
            where: { email: String(email).trim().toLowerCase() }
        });
        if (existingEmail) {
            res.status(400).json({ message: 'An agency with this email already exists' });
            return;
        }

        let finalCode = referral_code ? String(referral_code).trim().toUpperCase() : generateReferralCode(name);
        const existingCode = await prisma.agency.findUnique({
            where: { referral_code: finalCode }
        });

        if (existingCode) {
            finalCode = generateReferralCode(name);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const agency = await prisma.agency.create({
            data: {
                name: String(name).trim(),
                email: String(email).trim().toLowerCase(),
                phone: String(phone).trim(),
                password: hashedPassword,
                referral_code: finalCode,
                commission_type: commission_type === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
                commission_rate: Number(commission_rate) || 10,
                min_payout_limit: Number(min_payout_limit) || 1000,
            }
        });

        res.status(201).json({
            message: 'Agency registered successfully',
            agency: {
                id: agency.id,
                name: agency.name,
                email: agency.email,
                phone: agency.phone,
                referral_code: agency.referral_code,
                commission_type: agency.commission_type,
                commission_rate: agency.commission_rate,
                min_payout_limit: agency.min_payout_limit,
            }
        });
    } catch (error) {
        console.error('Error creating agency:', error);
        res.status(500).json({ message: 'Server error creating agency' });
    }
};

/**
 * Admin: Get all Agencies
 */
export const getAllAgencies = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencies = await prisma.agency.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: {
                        students: true,
                        earnings: true,
                        payouts: true,
                    }
                }
            }
        });

        // Compute total revenue brought per agency
        const agenciesWithMetrics = await Promise.all(
            agencies.map(async (agency) => {
                const totalRevenue = await prisma.referralEarning.aggregate({
                    where: { agency_id: agency.id },
                    _sum: { amount_paid: true }
                });

                return {
                    ...agency,
                    password: undefined, // Strip password hash
                    student_count: agency._count.students,
                    total_revenue: totalRevenue._sum.amount_paid || 0,
                };
            })
        );

        res.json(agenciesWithMetrics);
    } catch (error) {
        console.error('Error getting agencies:', error);
        res.status(500).json({ message: 'Server error fetching agencies' });
    }
};

/**
 * Admin: Get single Agency details
 */
export const getAgencyById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const agency = await prisma.agency.findUnique({
            where: { id: Number(id) },
            include: {
                students: {
                    include: {
                        user: { select: { name: true, email: true, phone: true } },
                        class: { select: { name: true } },
                        board: { select: { name: true } },
                    }
                },
                earnings: {
                    take: 50,
                    orderBy: { created_at: 'desc' },
                    include: {
                        student: { include: { user: { select: { name: true } } } }
                    }
                },
                payouts: {
                    orderBy: { requested_at: 'desc' }
                }
            }
        });

        if (!agency) {
            res.status(404).json({ message: 'Agency not found' });
            return;
        }

        res.json({
            ...agency,
            password: undefined,
        });
    } catch (error) {
        console.error('Error getting agency by id:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Admin: Update Agency
 */
export const updateAgency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, email, phone, password, referral_code, commission_type, commission_rate, min_payout_limit, is_active } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
        if (phone !== undefined) updateData.phone = String(phone).trim();
        if (referral_code !== undefined) updateData.referral_code = String(referral_code).trim().toUpperCase();
        if (commission_type !== undefined) updateData.commission_type = commission_type === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
        if (commission_rate !== undefined) updateData.commission_rate = Number(commission_rate);
        if (min_payout_limit !== undefined) updateData.min_payout_limit = Number(min_payout_limit);
        if (is_active !== undefined) updateData.is_active = Boolean(is_active);

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const agency = await prisma.agency.update({
            where: { id: Number(id) },
            data: updateData
        });

        res.json({
            message: 'Agency updated successfully',
            agency: {
                ...agency,
                password: undefined,
            }
        });
    } catch (error) {
        console.error('Error updating agency:', error);
        res.status(500).json({ message: 'Server error updating agency' });
    }
};

/**
 * Admin: Delete Agency
 */
export const deleteAgency = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await prisma.agency.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Agency deleted successfully' });
    } catch (error) {
        console.error('Error deleting agency:', error);
        res.status(500).json({ message: 'Server error deleting agency' });
    }
};

// ==================== AGENCY PORTAL DASHBOARD & ACTIONS ====================

/**
 * Agency Portal Dashboard overview data
 */
export const getAgencyDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencyId = (req as any).user?.agencyId || (req as any).user?.id;
        if (!agencyId) {
            res.status(401).json({ message: 'Unauthorized agency session' });
            return;
        }

        const agency = await prisma.agency.findUnique({
            where: { id: Number(agencyId) },
            include: {
                _count: {
                    select: {
                        students: true,
                        earnings: true,
                        payouts: true,
                    }
                }
            }
        });

        if (!agency) {
            res.status(404).json({ message: 'Agency not found' });
            return;
        }

        // Aggregate total revenue generated by referred students
        const revenueAgg = await prisma.referralEarning.aggregate({
            where: { agency_id: agency.id },
            _sum: { amount_paid: true }
        });

        // Recent earnings log
        const recentEarnings = await prisma.referralEarning.findMany({
            where: { agency_id: agency.id },
            take: 10,
            orderBy: { created_at: 'desc' },
            include: {
                student: {
                    include: {
                        user: { select: { name: true, email: true, phone: true } }
                    }
                }
            }
        });

        // Recent payouts
        const recentPayouts = await prisma.referralPayout.findMany({
            where: { agency_id: agency.id },
            take: 10,
            orderBy: { requested_at: 'desc' }
        });

        const progressPercent = Math.min(100, Math.round((agency.points_balance / (agency.min_payout_limit || 1)) * 100));

        res.json({
            agency: {
                id: agency.id,
                name: agency.name,
                email: agency.email,
                phone: agency.phone,
                referral_code: agency.referral_code,
                commission_type: agency.commission_type,
                commission_rate: agency.commission_rate,
                min_payout_limit: agency.min_payout_limit,
                points_balance: agency.points_balance,
                total_earnings: agency.total_earnings,
                paid_earnings: agency.paid_earnings,
                total_students: agency._count.students,
                total_revenue: revenueAgg._sum.amount_paid || 0,
                progress_percent: progressPercent,
                can_request_payout: agency.points_balance >= agency.min_payout_limit,
            },
            recentEarnings,
            recentPayouts,
        });
    } catch (error) {
        console.error('Error fetching agency dashboard:', error);
        res.status(500).json({ message: 'Server error loading agency dashboard' });
    }
};

/**
 * Agency Portal: Create a new Student Profile directly from agency account
 */
export const createStudentByAgency = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencyId = (req as any).user?.agencyId || (req as any).user?.id;
        if (!agencyId) {
            res.status(401).json({ message: 'Unauthorized agency session' });
            return;
        }

        const agency = await prisma.agency.findUnique({
            where: { id: Number(agencyId) }
        });

        if (!agency || !agency.is_active) {
            res.status(403).json({ message: 'Agency account is inactive' });
            return;
        }

        const { name, email, phone, password, class_id, board_id, gender, school } = req.body;

        if (!name || !email || !phone || !password) {
            res.status(400).json({ message: 'Name, email, phone, and password are required' });
            return;
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: String(email).trim().toLowerCase() }
        });

        if (existingUser) {
            res.status(400).json({ message: 'A student with this email address already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction to create User and Student linked to agency
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: String(name).trim(),
                    email: String(email).trim().toLowerCase(),
                    phone: String(phone).trim(),
                    password: hashedPassword,
                    role: 'STUDENT',
                    reference_code: agency.referral_code,
                }
            });

            const student = await tx.student.create({
                data: {
                    user_id: user.id,
                    class_id: class_id ? Number(class_id) : null,
                    board_id: board_id ? Number(board_id) : null,
                    gender: gender || null,
                    school: school || null,
                    reference_code: agency.referral_code,
                    agency_id: agency.id,
                },
                include: {
                    user: { select: { id: true, name: true, email: true, phone: true } },
                    class: { select: { name: true } },
                    board: { select: { name: true } },
                }
            });

            return student;
        });

        res.status(201).json({
            message: 'Student created successfully and linked to your agency profile',
            student: result,
        });
    } catch (error) {
        console.error('Error creating student by agency:', error);
        res.status(500).json({ message: 'Server error creating student' });
    }
};

/**
 * Agency Portal: Get list of referred students
 */
export const getAgencyStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencyId = (req as any).user?.agencyId || (req as any).user?.id;
        const students = await prisma.student.findMany({
            where: { agency_id: Number(agencyId) },
            include: {
                user: { select: { name: true, email: true, phone: true, created_at: true } },
                class: { select: { name: true } },
                board: { select: { name: true } },
                enrollments: {
                    include: {
                        subject: { select: { name: true } },
                        payments: true,
                    }
                },
                referral_earnings: {
                    select: {
                        amount_paid: true,
                        commission_amount: true,
                        created_at: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        const studentsWithStats = students.map(s => {
            const totalPaid = s.referral_earnings.reduce((sum, e) => sum + e.amount_paid, 0);
            const totalCommissionEarned = s.referral_earnings.reduce((sum, e) => sum + e.commission_amount, 0);

            return {
                id: s.id,
                name: s.user.name,
                email: s.user.email,
                phone: s.user.phone,
                class_name: s.class?.name || 'N/A',
                board_name: s.board?.name || 'N/A',
                created_at: s.user.created_at,
                total_paid: totalPaid,
                total_commission: totalCommissionEarned,
            };
        });

        res.json(studentsWithStats);
    } catch (error) {
        console.error('Error getting agency students:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Agency Portal: Get earnings history
 */
export const getAgencyEarnings = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencyId = (req as any).user?.agencyId || (req as any).user?.id;
        const earnings = await prisma.referralEarning.findMany({
            where: { agency_id: Number(agencyId) },
            include: {
                student: {
                    include: {
                        user: { select: { name: true, email: true, phone: true } }
                    }
                },
                payment: true,
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(earnings);
    } catch (error) {
        console.error('Error getting agency earnings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Agency Portal: Submit Reimbursement / Payout Request
 */
export const requestPayout = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencyId = (req as any).user?.agencyId || (req as any).user?.id;
        const { amount, payout_method, account_details, notes } = req.body;

        const agency = await prisma.agency.findUnique({
            where: { id: Number(agencyId) }
        });

        if (!agency) {
            res.status(404).json({ message: 'Agency not found' });
            return;
        }

        const reqAmount = Number(amount) || agency.points_balance;

        if (reqAmount <= 0) {
            res.status(400).json({ message: 'Requested amount must be greater than 0' });
            return;
        }

        if (agency.points_balance < agency.min_payout_limit) {
            res.status(400).json({
                message: `Minimum redeemable balance limit of Rs ${agency.min_payout_limit} not reached. Current balance: Rs ${agency.points_balance}`
            });
            return;
        }

        if (reqAmount > agency.points_balance) {
            res.status(400).json({
                message: `Requested amount exceeds available balance of Rs ${agency.points_balance}`
            });
            return;
        }

        // Check if there is already a pending payout request
        const pendingPayout = await prisma.referralPayout.findFirst({
            where: { agency_id: agency.id, status: 'PENDING' }
        });

        if (pendingPayout) {
            res.status(400).json({ message: 'You already have a pending payout request under review' });
            return;
        }

        const payout = await prisma.referralPayout.create({
            data: {
                agency_id: agency.id,
                amount: reqAmount,
                status: 'PENDING',
                payout_method: payout_method || 'Bank Transfer',
                account_details: account_details || null,
                notes: notes || null,
            }
        });

        res.status(201).json({
            message: 'Reimbursement request submitted successfully to Admin',
            payout,
        });
    } catch (error) {
        console.error('Error requesting payout:', error);
        res.status(500).json({ message: 'Server error submitting payout request' });
    }
};

/**
 * Agency Portal & Admin: Get Payout Requests
 */
export const getAgencyPayouts = async (req: Request, res: Response): Promise<void> => {
    try {
        const agencyId = (req as any).user?.agencyId || (req as any).user?.id;
        const isAgencyUser = (req as any).user?.role === 'AGENCY';

        const whereClause = isAgencyUser ? { agency_id: Number(agencyId) } : {};

        const payouts = await prisma.referralPayout.findMany({
            where: whereClause,
            include: {
                agency: {
                    select: { id: true, name: true, email: true, phone: true, points_balance: true }
                }
            },
            orderBy: { requested_at: 'desc' }
        });

        res.json(payouts);
    } catch (error) {
        console.error('Error getting payouts:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Admin: Approve / Reject / Mark Paid Payout Request
 */
export const handlePayoutRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { payoutId } = req.params;
        const { status, notes } = req.body; // APPROVED, REJECTED, PAID

        if (!['APPROVED', 'REJECTED', 'PAID'].includes(status)) {
            res.status(400).json({ message: 'Invalid payout status. Must be APPROVED, REJECTED, or PAID' });
            return;
        }

        const payout = await prisma.referralPayout.findUnique({
            where: { id: Number(payoutId) },
            include: { agency: true }
        });

        if (!payout) {
            res.status(404).json({ message: 'Payout request not found' });
            return;
        }

        // If marking as PAID, deduct from points_balance and add to paid_earnings
        await prisma.$transaction(async (tx) => {
            await tx.referralPayout.update({
                where: { id: payout.id },
                data: {
                    status: status as any,
                    notes: notes || payout.notes,
                    processed_at: new Date(),
                }
            });

            if (status === 'PAID' && payout.status !== 'PAID') {
                await tx.agency.update({
                    where: { id: payout.agency_id },
                    data: {
                        points_balance: { decrement: payout.amount },
                        paid_earnings: { increment: payout.amount },
                    }
                });

                // Update earnings status to REIMBURSED
                await tx.referralEarning.updateMany({
                    where: { agency_id: payout.agency_id, status: 'EARNED' },
                    data: { status: 'REIMBURSED' }
                });
            }
        });

        res.json({ message: `Payout request marked as ${status}` });
    } catch (error) {
        console.error('Error handling payout request:', error);
        res.status(500).json({ message: 'Server error updating payout status' });
    }
};

// ==================== HELPER FUNCTION TO ISSUE COMMISSION ON PAYMENT ====================

/**
 * Process referral commission for a completed payment
 */
export async function processReferralCommissionForPayment(paymentId: number): Promise<void> {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: Number(paymentId) },
            include: {
                enrollment: {
                    include: {
                        student: {
                            include: { agency: true }
                        }
                    }
                }
            }
        });

        if (!payment || !payment.is_paid || !payment.enrollment?.student?.agency) {
            return; // No referring agency or payment not paid
        }

        const student = payment.enrollment.student;
        const agency = student.agency;

        if (!agency || !agency.is_active) {
            return;
        }

        // Check if referral earning already recorded for this payment
        const existingEarning = await prisma.referralEarning.findFirst({
            where: { payment_id: payment.id }
        });

        if (existingEarning) {
            return; // Already processed
        }

        // Calculate commission
        let commissionAmount = 0;
        if (agency.commission_type === 'PERCENTAGE') {
            commissionAmount = (payment.amount * agency.commission_rate) / 100;
        } else {
            commissionAmount = agency.commission_rate; // Fixed amount per payment
        }

        commissionAmount = Math.round(commissionAmount * 100) / 100;

        if (commissionAmount <= 0) return;

        // Transaction to create Earning and credit Agency balance
        await prisma.$transaction(async (tx) => {
            await tx.referralEarning.create({
                data: {
                    agency_id: agency.id,
                    student_id: student.id,
                    payment_id: payment.id,
                    amount_paid: payment.amount,
                    commission_amount: commissionAmount,
                    status: 'EARNED',
                    notes: `Commission for payment #${payment.id} (${payment.period})`,
                }
            });

            await tx.agency.update({
                where: { id: agency.id },
                data: {
                    total_earnings: { increment: commissionAmount },
                    points_balance: { increment: commissionAmount },
                }
            });
        });

        console.log(`[ReferralSystem] Credited Rs ${commissionAmount} commission to Agency '${agency.name}' for Student '${student.id}' payment #${payment.id}`);
    } catch (error) {
        console.error('Error processing referral commission:', error);
    }
}
