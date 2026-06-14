import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/http.js';

const router = Router();

function monthBounds(date = new Date()) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const { start, end } = monthBounds(now);
    const next7 = new Date(now);
    next7.setDate(now.getDate() + 7);

    const [
      monthlyEvents,
      monthlyFinancialEvents,
      upcomingEvents,
      venues,
      topVenues,
      distribution,
      unpaidDepositEvents,
    ] = await Promise.all([
      prisma.event.count({
        where: { organizationId: req.user.organizationId, deletedAt: null, eventDate: { gte: start, lt: end }, status: { not: 'cancelled' } },
      }),
      prisma.event.findMany({
        where: { organizationId: req.user.organizationId, deletedAt: null, eventDate: { gte: start, lt: end }, status: { not: 'cancelled' } },
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.event.findMany({
        where: {
          organizationId: req.user.organizationId,
          deletedAt: null,
          eventDate: { gte: now, lte: next7 },
          status: { in: ['confirmed', 'in_preparation'] },
        },
        include: { client: true, venue: true },
        orderBy: { eventDate: 'asc' },
      }),
      prisma.venue.findMany({ where: { organizationId: req.user.organizationId, deletedAt: null }, select: { id: true, name: true } }),
      prisma.event.groupBy({
        by: ['venueId'],
        where: { organizationId: req.user.organizationId, deletedAt: null, eventDate: { gte: start, lt: end }, status: { not: 'cancelled' } },
        _count: { _all: true },
        orderBy: { _count: { venueId: 'desc' } },
        take: 5,
      }),
      prisma.event.groupBy({
        by: ['eventType'],
        where: { organizationId: req.user.organizationId, deletedAt: null, eventDate: { gte: start, lt: end }, status: { not: 'cancelled' } },
        _count: { _all: true },
      }),
      prisma.event.findMany({
        where: {
          eventDate: { gte: now },
          organizationId: req.user.organizationId,
          deletedAt: null,
          status: { in: ['confirmed', 'in_preparation'] },
          depositAmount: { gt: new Prisma.Decimal(0) },
        },
        select: { depositAmount: true, paidAmount: true },
      }),
    ]);

    const estimatedRevenue = monthlyFinancialEvents.reduce((sum, event) => sum.plus(event.totalAmount), new Prisma.Decimal(0));
    const actualRevenue = monthlyFinancialEvents.reduce((sum, event) => sum.plus(event.paidAmount), new Prisma.Decimal(0));
    const outstandingDeposits = unpaidDepositEvents.reduce((sum, event) => {
      const missing = new Prisma.Decimal(event.depositAmount).minus(event.paidAmount);
      return missing.greaterThan(0) ? sum.plus(missing) : sum;
    }, new Prisma.Decimal(0));

    const venueMap = new Map(venues.map((venue) => [venue.id, venue]));
    const daysInMonth = Math.round((end - start) / 86_400_000);
    const venueOccupancy = venues.map((venue) => {
      const count = topVenues.find((item) => item.venueId === venue.id)?._count?._all || 0;
      return { venueId: venue.id, venueName: venue.name, events: count, occupancyRate: Number(((count / daysInMonth) * 100).toFixed(2)) };
    });

    res.json({
      data: {
        currentMonthEvents: monthlyEvents,
        estimatedRevenue: Number(estimatedRevenue),
        actualRevenue: Number(actualRevenue),
        outstandingDeposits: Number(outstandingDeposits),
        venueOccupancy,
        next7DaysEvents: upcomingEvents,
        topVenuesByOccupancy: topVenues.map((item) => ({
          venueId: item.venueId,
          venueName: venueMap.get(item.venueId)?.name || 'Necunoscut',
          events: item._count._all,
        })),
        eventTypeDistribution: distribution.map((item) => ({ eventType: item.eventType, events: item._count._all })),
      },
    });
  }),
);

export default router;
