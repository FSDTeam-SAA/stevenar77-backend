Thanks — here’s a clear plan to address capacity and participant counting across trips, carts, and payments.

## Plan: Trip capacity and counts

TL;DR: We’ll compute purchased participant counts per trip and per date from `Booking` records, enforce maximum capacity at cart creation (considering multi-participant bookings), ensure counts reflect successful payments, and make the logic date-aware so admin date changes don’t corrupt totals. We’ll expose the counts in `getAllTrips` and harden `createCartItem` and the payment cron to keep data consistent.

### Steps

1. Add `tripDate` to `Booking` and set it in `cartService.createCartItem` for trips ([src/modules/trips/booking/booking.model.ts](src/modules/trips/booking/booking.model.ts), [src/modules/cart/cart.service.ts](src/modules/cart/cart.service.ts#L1-L100) `createCartItem`). If your trip model uses `startDate`/`endDate`, align `tripDate` to the actual date the user books (default to `startDate` if there is no per-occurrence selection).
2. Enforce capacity in `createCartItem`: sum `totalParticipants` for `trip` + `tripDate` with `status` in `['pending', 'paid']`; block if adding the new cart’s `participants.length` would exceed `maximumCapacity` ([src/modules/cart/cart.service.ts](src/modules/cart/cart.service.ts#L1-L100) `createCartItem`, [src/modules/trips/trip.model.ts](src/modules/trips/trip.model.ts)). This avoids race overbooking.
3. Return participant totals in `getAllTrips`: include `purchasedParticipants` (sum of `paid` bookings across the trip) and `purchasedByDate` (map/date array of sums per `tripDate`) ([src/modules/trips/trip.controller.ts](src/modules/trips/trip.controller.ts), [src/modules/trips/trip.routes.ts](src/modules/trips/trip.routes.ts#L1-L100) `TripController.getAllTrips`).
4. Fix cron booking update: for trip carts, update booking via `cart.bookingId` (not `itemId`), set booking `status='paid'`, and rely on bookings to drive counts; keep participant emails as-is ([src/jobs/paymentStatusJob.ts](src/jobs/paymentStatusJob.ts#L1-L200)).
5. Guard admin date edits: when `startDate`/`endDate` changes for a trip with existing bookings, either restrict changes or migrate affected bookings’ `tripDate` accordingly. Counts remain derived per `tripDate`, so totals stay correct ([src/modules/trips/trip.controller.ts](src/modules/trips/trip.controller.ts), [src/modules/trips/trip.model.ts](src/modules/trips/trip.model.ts)).

### Further Considerations

- Concurrency: for strict guarantees, consider a short-lived reservation/lock during checkout or a single atomic capacity check+insert (e.g., using transactions).
- Data migration: backfill `tripDate` for existing bookings; if missing, compute from trip `startDate`.
- Validation: ensure `tripDate` lies within `[startDate, endDate]` when the trip spans multiple days.
- Bug risk: `paymentStatusJob` currently uses `cart.itemId` for trips — change to `cart.bookingId` to avoid updating the wrong doc.

### What I understood from the codebase

- Trips: `maximumCapacity` is in [src/modules/trips/trip.model.ts](src/modules/trips/trip.model.ts). `getAllTrips` is exposed via [src/modules/trips/trip.routes.ts](src/modules/trips/trip.routes.ts#L1-L100). We’ll extend the controller to aggregate booking-based counts.
- Bookings (trip): In [src/modules/cart/cart.service.ts](src/modules/cart/cart.service.ts#L1-L52), creating a trip cart creates a `Booking` with `participants`, `totalParticipants`, `status: 'pending'`. There’s no explicit date field on bookings yet; we’ll add `tripDate`.
- Carts: Trip cart items set `bookingId`. `itemId` remains the trip id; later logic must use `bookingId` when updating booking status.
- Payments: The cron in [src/jobs/paymentStatusJob.ts](src/jobs/paymentStatusJob.ts#L1-L200) sets trip booking `status: 'paid'` and emails users/participants; it sometimes reads `cart.bookingId` but updates by `cart.itemId` — this is the key inconsistency to fix.
- Capacity enforcement: Not implemented today; we’ll enforce it at cart creation using bookings count for the same trip/date.

If this matches your intent, we’ll proceed to implement: schema update for `Booking`, controller aggregation for trips, cart capacity checks, and cron fix.
