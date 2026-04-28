/**
 * ADMIN CONTROLLER
 * Admin approval/rejection of pending Cash App payments
 */

// Mock storage for pending payments
const pendingPayments = new Map();

// ============================================================================
// CONTROLLER: GET /api/admin/pending-approvals
// ============================================================================

export async function getPendingApprovals(req, res) {
  try {
    // TODO: Add authentication check
    // if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });

    // TODO: Query MongoDB
    // const pending = await db.collection('reservations')
    //   .find({ status: 'PENDING_ADMIN_APPROVAL' })
    //   .toArray();

    const pending = Array.from(pendingPayments.values()).filter(
      p => p.status === 'PENDING_ADMIN_APPROVAL'
    );

    res.json({
      success: true,
      count: pending.length,
      pending: pending.map(p => ({
        reservationId: p.reservationId,
        eventId: p.eventId,
        uploadedBy: p.uploadedBy,
        uploadedAt: p.uploadedAt,
        filename: p.filename,
        status: p.status,
      })),
    });
  } catch (err) {
    console.error('❌ Error in getPendingApprovals:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/admin/approve-payment
// ============================================================================

export async function approvePayment(req, res) {
  const { reservation_id, approval_note } = req.body;

  try {
    // TODO: Add authentication check
    // if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });

    if (!reservation_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing reservation_id',
      });
    }

    // TODO: Update MongoDB
    // const result = await db.collection('reservations').updateOne(
    //   { reservationId: reservation_id },
    //   {
    //     $set: {
    //       status: 'APPROVED',
    //       'cashapp.adminApprovalNote': approval_note,
    //       'cashapp.approvedAt': new Date(),
    //     }
    //   }
    // );

    // Mock update
    const payment = pendingPayments.get(reservation_id);
    if (payment) {
      payment.status = 'APPROVED';
      payment.approvalNote = approval_note;
      payment.approvedAt = new Date();
    }

    // TODO: Send confirmation email to user
    // TODO: Send Telegram notification to admin

    console.log(`✅ Payment approved: ${reservation_id}`);

    res.json({
      success: true,
      message: 'Payment approved successfully',
      reservationId: reservation_id,
      status: 'APPROVED',
    });
  } catch (err) {
    console.error('❌ Error in approvePayment:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to approve payment',
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/admin/reject-payment
// ============================================================================

export async function rejectPayment(req, res) {
  const { reservation_id, rejection_reason } = req.body;

  try {
    // TODO: Add authentication check
    // if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });

    if (!reservation_id || !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reservation_id, rejection_reason',
      });
    }

    // TODO: Update MongoDB
    // const result = await db.collection('reservations').updateOne(
    //   { reservationId: reservation_id },
    //   {
    //     $set: {
    //       status: 'REJECTED',
    //       'cashapp.rejectedAt': new Date(),
    //       'cashapp.rejectionReason': rejection_reason,
    //     }
    //   }
    // );

    // Mock update
    const payment = pendingPayments.get(reservation_id);
    if (payment) {
      payment.status = 'REJECTED';
      payment.rejectionReason = rejection_reason;
      payment.rejectedAt = new Date();
    }

    // TODO: Send rejection email to user
    // TODO: Release/free the held seats

    console.log(`❌ Payment rejected: ${reservation_id}`);

    res.json({
      success: true,
      message: 'Payment rejected successfully',
      reservationId: reservation_id,
      status: 'REJECTED',
      reason: rejection_reason,
    });
  } catch (err) {
    console.error('❌ Error in rejectPayment:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to reject payment',
    });
  }
}

// ============================================================================
// CONTROLLER: GET /api/admin/stats
// ============================================================================

export async function getAdminStats(req, res) {
  try {
    // TODO: Add authentication check

    // TODO: Query MongoDB for stats
    // const stats = await db.collection('reservations').aggregate([...]).toArray();

    // Mock stats
    const approved = Array.from(pendingPayments.values()).filter(p => p.status === 'APPROVED').length;
    const rejected = Array.from(pendingPayments.values()).filter(p => p.status === 'REJECTED').length;
    const pending = Array.from(pendingPayments.values()).filter(p => p.status === 'PENDING_ADMIN_APPROVAL').length;

    res.json({
      success: true,
      stats: {
        totalReservations: pendingPayments.size,
        approved,
        rejected,
        pendingApproval: pending,
      },
    });
  } catch (err) {
    console.error('❌ Error in getAdminStats:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats',
    });
  }
}
