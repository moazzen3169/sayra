openapi: 3.0.0
info:
  title: Playenest API
  description: API Documentation for Playenest Gamenet Management System
  version: v1.0-LOCKED
  x-api-contract-version: v1.0-LOCKED
  contact:
    name: Playenest Support
    email: support@playenest.com

servers:
  - url: /api/v1
    description: V1 API

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  responses:
    UnauthorizedError:
      description: Access token is missing or invalid
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    ForbiddenError:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFoundError:
      description: The requested resource was not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    ValidationError:
      description: Invalid request payload
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    InternalServerError:
      description: Unexpected server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  schemas:
    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              description: Unique error code for machine handling
              enum:
                - INTERNAL_ERROR
                - APP_ERROR
                - VALIDATION_ERROR
                - DB_REQUEST_FAILED
                - NOT_FOUND
                - CONFLICT
                - UNAUTHORIZED
                - FORBIDDEN
                - SLOT_NOT_AVAILABLE
                - RESERVATION_OVERLAP
                - OVERLAP_CONFLICT
                - RESERVATION_START_TIME_IN_PAST
                - INVALID_TRANSITION
                - ONLINE_RESERVATION_DISABLED
                - IDEMPOTENCY_KEY_REQUIRED
                - IDEMPOTENCY_KEY_INVALID_LENGTH
                - IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD
                - IDEMPOTENCY_REQUEST_IN_PROGRESS
              example: "VALIDATION_ERROR"
            message:
              type: string
              description: Human-readable error message
              example: "Invalid request payload."
            details:
              type: object
              description: Optional additional error details (e.g., validation issues)
              nullable: true
        meta:
          $ref: '#/components/schemas/Meta'

    Success:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
        meta:
          $ref: '#/components/schemas/Meta'

    AuthResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            accessToken:
              type: string
            refreshToken:
              type: string
            user:
              $ref: '#/components/schemas/User'

    User:
      type: object
      properties:
        id:
          type: string
        phone:
          type: string
        fullName:
          type: string
        role:
          type: string
          enum: [MANAGER, SUPERVISOR, STAFF, TRAINEE, SUPPORT, ADMIN]
        isActive:
          type: boolean

    Ticket:
      type: object
      properties:
        id:
          type: string
        customerAccountId:
          type: string
        assignedToUserId:
          type: string
          nullable: true
        subject:
          type: string
        status:
          type: string
          enum: [OPEN, PENDING, ANSWERED, CLOSED]
        priority:
          type: string
          enum: [LOW, MEDIUM, HIGH]
        category:
          type: string
          enum: [TECHNICAL, FINANCIAL, SALES, ACCOUNT]
        closedAt:
          type: string
          format: date-time
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        messages:
          type: array
          items:
            $ref: '#/components/schemas/TicketMessage'

    TicketMessage:
      type: object
      properties:
        id:
          type: string
        ticketId:
          type: string
        senderId:
          type: string
        senderType:
          type: string
          enum: [USER, SUPPORT]
        text:
          type: string
        attachment:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time

    GamingCenter:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        slug:
          type: string
        isActive:
          type: boolean
        description:
          type: string
        createdAt:
          type: string
          format: date-time

    GameStation:
      type: object
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        name:
          type: string
        stationType:
          type: string
          enum: [PC, PLAYSTATION, XBOX, SWITCH, VR]
        isVip:
          type: boolean
        hourlyPrice:
          type: number
        minRentHours:
          type: integer
        maxRentHours:
          type: integer
        defaultDurationHours:
          type: integer
        incrementMinutes:
          type: integer
        isActive:
          type: boolean

    Reservation:
      type: object
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        stationId:
          type: string
        staffId:
          type: string
        customerAccountId:
          type: string
        startTime:
          type: string
          format: date-time
        endTime:
          type: string
          format: date-time
        status:
          type: string
          enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELED, NO_SHOW]
        paymentState:
          type: string
          enum: [UNPAID, PENDING, PARTIALLY_PAID, PAID, REFUNDED, OVERPAID, FAILED, CANCELED]
        totalHours:
          type: number
        totalPrice:
          type: number
        stationSnapshot:
          type: object
          properties:
            name:
              type: string
            hourlyPrice:
              type: number
            stationType:
              type: string

    ReservationTimeProposal:
      type: object
      properties:
        id:
          type: string
        reservationId:
          type: string
        originalStartTime:
          type: string
          format: date-time
        originalEndTime:
          type: string
          format: date-time
        proposedStartTime:
          type: string
          format: date-time
        proposedEndTime:
          type: string
          format: date-time
        note:
          type: string
          nullable: true
        status:
          type: string
          enum: [PENDING, ACCEPTED, REJECTED, EXPIRED, CANCELLED]
        createdByUserId:
          type: string
        customerRespondedAt:
          type: string
          format: date-time
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Staff:
      type: object
      allOf:
        - $ref: '#/components/schemas/User'
        - type: object
          properties:
            isPublic:
              type: boolean
            publicName:
              type: string
            bio:
              type: string
            avatarUrl:
              type: string

    Customer:
      type: object
      properties:
        id:
          type: string
        phone:
          type: string
        fullName:
          type: string
        phoneVerifiedAt:
          type: string
          format: date-time

    Meta:
      type: object
      properties:
        requestId:
          type: string
          example: "ckv1abc..."
        pagination:
          type: object
          properties:
            totalItems:
              type: integer
            page:
              type: integer
            pageSize:
              type: integer
            limit:
              type: integer
            total:
              type: integer
            totalPages:
              type: integer

    Pagination:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: array
          items:
            type: object
        meta:
          $ref: '#/components/schemas/Meta'

    Settings:
      type: object
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        timeZone:
          type: string
        workStartTime:
          type: string
        workEndTime:
          type: string
        allowOnlineBooking:
          type: boolean
        onlineBookingAutoConfirm:
          type: boolean
        preventOverlaps:
          type: boolean

    SiteSettings:
      type: object
      properties:
        logoUrl:
          type: string
        faviconUrl:
          type: string
        defaultSeoTitle:
          type: string
        defaultSeoDescription:
          type: string
        robotsIndex:
          type: string
          enum: [INDEX, NOINDEX]
        robotsFollow:
          type: string
          enum: [FOLLOW, NOFOLLOW]

    CommissionPolicy:
      type: object
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        type:
          type: string
          enum: [PERCENT, FIXED]
        percentBps:
          type: integer
        fixedAmount:
          type: integer
        currency:
          type: string
        isActive:
          type: boolean

    Earning:
      type: object
      properties:
        id:
          type: string
        reservationId:
          type: string
        gamingCenterId:
          type: string
        status:
          type: string
          enum: [PENDING, ACCRUED, CHARGED, WAIVED, REFUNDED]
        commissionAmount:
          type: integer
        currency:
          type: string

    Rating:
      type: object
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        reservationId:
          type: string
        rating:
          type: integer
        comment:
          type: string
        status:
          type: string
          enum: [PUBLISHED, HIDDEN, DELETED]

    Notification:
      type: object
      properties:
        id:
          type: string
        userId:
          type: string
        type:
          type: string
          enum: [RESERVATION_CREATED, RESERVATION_CONFIRMED, RESERVATION_REJECTED, RESERVATION_CANCELLED, RESERVATION_TIME_PROPOSED]
        title:
          type: string
        message:
          type: string
        isRead:
          type: boolean
        metadata:
          type: object
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Discount:
      type: object
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        targetType:
          type: string
          enum: [GAMING_CENTER, STATION]
        targetId:
          type: string
        valueType:
          type: string
          enum: [PERCENTAGE, FIXED_AMOUNT]
        value:
          type: number
        startAt:
          type: string
          format: date-time
        endAt:
          type: string
          format: date-time
        isActive:
          type: boolean
        createdByUserId:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

paths:
  /health:
    get:
      summary: Health Check
      tags:
        - System
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/discounts:
    get:
      summary: List discounts
      tags:
        - Discounts
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: targetType
          in: query
          schema:
            type: string
            enum: [GAMING_CENTER, STATION]
        - name: targetId
          in: query
          schema:
            type: string
        - name: isActive
          in: query
          schema:
            type: boolean
        - name: page
          in: query
          schema:
            type: integer
        - name: pageSize
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: List of discounts
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

    post:
      summary: Create a new discount
      tags:
        - Discounts
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - targetType
                - targetId
                - valueType
                - value
                - startAt
                - endAt
              properties:
                targetType:
                  type: string
                  enum: [GAMING_CENTER, STATION]
                targetId:
                  type: string
                valueType:
                  type: string
                  enum: [PERCENTAGE, FIXED_AMOUNT]
                value:
                  type: number
                startAt:
                  type: string
                  format: date-time
                endAt:
                  type: string
                  format: date-time
                isActive:
                  type: boolean
      responses:
        '201':
          description: Discount created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  /gamingCenters/{gamingCenterId}/discounts/{id}:
    get:
      summary: Get discount by ID
      tags:
        - Discounts
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Discount details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'

    patch:
      summary: Update discount details
      tags:
        - Discounts
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                targetType:
                  type: string
                  enum: [GAMING_CENTER, STATION]
                targetId:
                  type: string
                valueType:
                  type: string
                  enum: [PERCENTAGE, FIXED_AMOUNT]
                value:
                  type: number
                startAt:
                  type: string
                  format: date-time
                endAt:
                  type: string
                  format: date-time
                isActive:
                  type: boolean
      responses:
        '200':
          description: Discount updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'

    delete:
      summary: Delete discount
      tags:
        - Discounts
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Discount deleted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /gamingCenters/{gamingCenterId}/discounts/{id}/status:
    patch:
      summary: Activate or deactivate discount
      tags:
        - Discounts
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - isActive
              properties:
                isActive:
                  type: boolean
      responses:
        '200':
          description: Discount status updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /notifications:
    get:
      summary: Get user notifications
      tags:
        - Notifications
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
        - name: pageSize
          in: query
          schema:
            type: integer
        - name: isRead
          in: query
          schema:
            type: boolean
      responses:
        '200':
          description: Paginated notifications list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /notifications/unread-count:
    get:
      summary: Get unread notification count
      tags:
        - Notifications
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Count of unread notifications
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /notifications/{id}/read:
    patch:
      summary: Mark notification as read
      tags:
        - Notifications
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Notification marked as read
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /gamingCenters/{gamingCenterId}/reservation/{reservationId}/propose-time:
    post:
      summary: Propose a new reservation time (Owner/Staff)
      tags:
        - Reservation
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - startTime
                - endTime
              properties:
                startTime:
                  type: string
                  format: date-time
                endTime:
                  type: string
                  format: date-time
                note:
                  type: string
      responses:
        '201':
          description: Time proposal created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservation/{reservationId}/proposals:
    get:
      summary: List time proposals for reservation (Owner/Staff)
      tags:
        - Reservation
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: List of proposals
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/pause:
    post:
      summary: Pause a gaming session for a reservation
      tags:
        - GamingSessions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Session paused
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /customer/reservation/{reservationId}/proposals:
    get:
      summary: List my reservation time proposals
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      parameters:
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: List of proposals
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /customer/reservation/{reservationId}/proposals/{proposalId}/accept:
    post:
      summary: Accept a proposed reservation time
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      parameters:
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
        - name: proposalId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Proposal accepted and reservation updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /customer/reservation/{reservationId}/proposals/{proposalId}/reject:
    post:
      summary: Reject a proposed reservation time
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      parameters:
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
        - name: proposalId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Proposal rejected
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/resume:
    post:
      summary: Resume a gaming session for a reservation
      tags:
        - GamingSessions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Session resumed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/analytics/summary:
    get:
      summary: Get analytics summary
      tags:
        - Analytics
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Analytics summary
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /gamingCenters/{gamingCenterId}/analytics/staff:
    get:
      summary: Get staff performance analytics
      tags:
        - Analytics
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Staff performance data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/analytics/stations:
    get:
      summary: Get station performance analytics
      tags:
        - Analytics
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: GameStation performance data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/analytics/revenue-chart:
    get:
      summary: Get revenue chart data
      tags:
        - Analytics
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Revenue over time data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/settings:
    get:
      summary: Get gamingCenter settings
      tags:
        - Settings
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: GamingCenter settings
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
    put:
      summary: Update gamingCenter settings
      tags:
        - Settings
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                timeZone:
                  type: string
                workStartTime:
                  type: string
                workEndTime:
                  type: string
                allowOnlineBooking:
                  type: boolean
                onlineBookingAutoConfirm:
                  type: boolean
                preventOverlaps:
                  type: boolean
      responses:
        '200':
          description: Settings updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/commissions:
    get:
      summary: List reservation earnings (commissions)
      tags:
        - Commissions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
        - name: pageSize
          in: query
          schema:
            type: integer
        - name: status
          in: query
          schema:
            type: string
            enum: [PENDING, ACCRUED, CHARGED, WAIVED, REFUNDED]
      responses:
        '200':
          description: List of earnings
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'

  /gamingCenters/{gamingCenterId}/commissions/policy:
    get:
      summary: Get commission policy
      tags:
        - Commissions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Policy details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
    post:
      summary: Upsert commission policy
      tags:
        - Commissions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - type
              properties:
                type:
                  type: string
                  enum: [PERCENT, FIXED]
                percentBps:
                  type: integer
                fixedAmount:
                  type: integer
                currency:
                  type: string
                applyToOnlineOnly:
                  type: boolean
                minimumFeeAmount:
                  type: integer
                isActive:
                  type: boolean
      responses:
        '200':
          description: Policy updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/commissions/{earningId}/pay:
    post:
      summary: Record commission payment
      tags:
        - Commissions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: earningId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - amount
                - currency
              properties:
                amount:
                  type: integer
                currency:
                  type: string
                status:
                  type: string
                  enum: [PENDING, PAID, VOID, REFUNDED]
                  default: PAID
                method:
                  type: string
                  enum: [CASH, CARD, ONLINE, TRANSFER]
                referenceCode:
                  type: string
                paidAt:
                  type: string
                  format: date-time
      responses:
        '200':
          description: Payment recorded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/audit-logs:
    get:
      summary: List audit logs
      tags:
        - Audit
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: entity
          in: query
          schema:
            type: string
        - name: action
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Audit logs
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'

  /gamingCenters/{gamingCenterId}/site-settings:
    get:
      summary: Get site settings
      tags:
        - CMS
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Site settings
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
    patch:
      summary: Update site settings
      tags:
        - CMS
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                logoUrl:
                  type: string
                faviconUrl:
                  type: string
                defaultSeoTitle:
                  type: string
                defaultSeoDescription:
                  type: string
                robotsIndex:
                  type: string
                  enum: [INDEX, NOINDEX]
                robotsFollow:
                  type: string
                  enum: [FOLLOW, NOFOLLOW]
      responses:
        '200':
          description: Settings updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/ratings/{id}/status:
    patch:
      summary: Moderate a review (status update)
      tags:
        - Ratings
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - status
              properties:
                status:
                  type: string
                  enum: [PUBLISHED, HIDDEN, DELETED]
      responses:
        '200':
          description: Status updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}:
    get:
      summary: Get public gaming center info
      tags:
        - Public
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Gaming center details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/pages/{pageSlug}:
    get:
      summary: Get a public page by slug
      tags:
        - Public
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
        - name: pageSlug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Page details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/media:
    get:
      summary: Get public media
      tags:
        - Public
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Media list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/links:
    get:
      summary: Get public social links
      tags:
        - Public
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Links list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/addresses:
    get:
      summary: Get public addresses
      tags:
        - Public
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Address list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/ratings:
    get:
      summary: List public ratings
      tags:
        - Public
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Ratings list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/reservation/{reservationId}/ratings:
    post:
      summary: Submit a review
      tags:
        - Public
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - rating
              properties:
                rating:
                  type: integer
                  minimum: 1
                  maximum: 5
                comment:
                  type: string
      responses:
        '201':
          description: Review submitted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/media/upload:
    post:
      summary: Upload an image
      tags:
        - CMS
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                purpose:
                  type: string
                  enum: [COVER, GALLERY, STATION, LOGO]
                altText:
                  type: string
      responses:
        '201':
          description: Image uploaded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/customers:
    get:
      summary: List customers for a gamingCenter
      tags:
        - Customers
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: search
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: List of customers
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'
    post:
      summary: Create or link a customer
      tags:
        - Customers
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - phone
              properties:
                phone:
                  type: string
                fullName:
                  type: string
                displayName:
                  type: string
                note:
                  type: string
      responses:
        '201':
          description: Customer created or linked
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/customers/{customerId}:
    patch:
      summary: Update customer profile
      tags:
        - Customers
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: customerId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                displayName:
                  type: string
                note:
                  type: string
                fullName:
                  type: string
      responses:
        '200':
          description: Customer updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/availability/slots:
    get:
      summary: Get available slots
      tags:
        - Availability
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
        - name: date
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: stationId
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Available slots
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /public/gamingCenters/{gamingCenterSlug}/reservation:
    post:
      summary: Create an online reservation
      tags:
        - Reservation
      parameters:
        - name: gamingCenterSlug
          in: path
          required: true
          schema:
            type: string
        - name: idempotency-key
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - stationId
                - startTime
                - customer
              properties:
                stationId:
                  type: string
                staffId:
                  type: string
                startTime:
                  type: string
                  format: date-time
                customer:
                  type: object
                  required:
                    - fullName
                    - phone
                  properties:
                    fullName:
                      type: string
                    phone:
                      type: string
                    email:
                      type: string
                note:
                  type: string
      responses:
        '201':
          description: Reservation created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservation:
    get:
      summary: List reservation for a gamingCenter
      tags:
        - Reservation
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
        - name: pageSize
          in: query
          schema:
            type: integer
        - name: status
          in: query
          schema:
            type: string
            enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELED, NO_SHOW]
      responses:
        '200':
          description: List of reservation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'
    post:
      summary: Create a reservation (Panel)
      tags:
        - Reservation
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - stationId
                - startTime
                - customer
              properties:
                stationId:
                  type: string
                staffId:
                  type: string
                startTime:
                  type: string
                  format: date-time
                customer:
                  type: object
                  required:
                    - fullName
                    - phone
                  properties:
                    fullName:
                      type: string
                    phone:
                      type: string
                note:
                  type: string
      responses:
        '201':
          description: Reservation created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservation/{reservationId}:
    get:
      summary: Get reservation by ID
      tags:
        - Reservation
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Reservation details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
    patch:
      summary: Update reservation details
      tags:
        - Reservation
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                stationId:
                  type: string
                staffId:
                  type: string
                startTime:
                  type: string
                  format: date-time
                note:
                  type: string
      responses:
        '200':
          description: Reservation updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/start:
    post:
      summary: Start a gaming session for a reservation
      tags:
        - GamingSessions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                stationId:
                  type: string
      responses:
        '201':
          description: Session started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/stop:
    post:
      summary: Stop a gaming session for a reservation
      tags:
        - GamingSessions
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Session stopped
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init:
    post:
      summary: Initiate payment for reservation
      tags:
        - Payments
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
        - name: idempotency-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Payment initiated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /customer/me:
    get:
      summary: Get current customer info
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Customer info
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /customer/reservation:
    get:
      summary: List my reservation
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of reservation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'

  /customer/reservation/{reservationId}:
    get:
      summary: Get reservation details
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      parameters:
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Reservation details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /customer/reservation/{reservationId}/cancel:
    post:
      summary: Cancel my reservation
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      parameters:
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Reservation canceled
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /customer/reservation/{reservationId}/ratings:
    post:
      summary: Submit a review (customer panel)
      tags:
        - Customer Panel
      security:
        - bearerAuth: []
      parameters:
        - name: reservationId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - rating
              properties:
                rating:
                  type: integer
                  minimum: 1
                  maximum: 5
                comment:
                  type: string
      responses:
        '201':
          description: Review submitted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/staff:
    get:
      summary: List staff for a gamingCenter
      tags:
        - Staff
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: List of staff
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
    post:
      summary: Add new staff member
      tags:
        - Staff
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - fullName
                - phone
                - role
              properties:
                fullName:
                  type: string
                phone:
                  type: string
                role:
                  type: string
                  enum: [MANAGER, SUPERVISOR, STAFF, TRAINEE]
                isPublic:
                  type: boolean
                publicName:
                  type: string
                bio:
                  type: string
                avatarUrl:
                  type: string
      responses:
        '201':
          description: Staff member added
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters/{gamingCenterId}/stations:
    get:
      summary: List stations for a gamingCenter
      tags:
        - Stations
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: List of stations
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'
    post:
      summary: Create a new station
      tags:
        - Stations
      security:
        - bearerAuth: []
      parameters:
        - name: gamingCenterId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - stationType
                - hourlyPrice
              properties:
                name:
                  type: string
                stationType:
                  type: string
                  enum: [PC, PLAYSTATION, XBOX, SWITCH, VR]
                hourlyPrice:
                  type: number
                minRentHours:
                  type: integer
                maxRentHours:
                  type: integer
                defaultDurationHours:
                  type: integer
                incrementMinutes:
                  type: integer
                isVip:
                  type: boolean
                isActive:
                  type: boolean
      responses:
        '201':
          description: GameStation created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /gamingCenters:
    get:
      summary: List all gamingCenters
      tags:
        - GamingCenters
      responses:
        '200':
          description: List of gamingCenters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'
    post:
      summary: Create a new gamingCenter
      tags:
        - GamingCenters
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - slug
                - ownerId
              properties:
                name:
                  type: string
                slug:
                  type: string
                ownerId:
                  type: string
                games:
                  type: array
                  items:
                    type: string
      responses:
        '201':
          description: GamingCenter created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /auth/me:
    get:
      summary: Get current user info
      tags:
        - Auth
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User info
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /auth/customer/otp/request:
    post:
      summary: Request OTP (Customer)
      tags:
        - Auth
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - phone
              properties:
                phone:
                  type: string
      responses:
        '200':
          description: OTP sent
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /auth/customer/otp/verify:
    post:
      summary: Verify OTP (Customer)
      tags:
        - Auth
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - phone
                - code
              properties:
                phone:
                  type: string
                code:
                  type: string
      responses:
        '200':
          description: Verified
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'

  /tickets:
    get:
      summary: List own tickets (Customer)
      tags:
        - Tickets
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of tickets
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'
    post:
      summary: Create a new ticket (Customer)
      tags:
        - Tickets
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - subject
                - message
                - category
              properties:
                subject:
                  type: string
                message:
                  type: string
                priority:
                  type: string
                  enum: [LOW, MEDIUM, HIGH]
                category:
                  type: string
                  enum: [TECHNICAL, FINANCIAL, SALES, ACCOUNT]
      responses:
        '201':
          description: Ticket created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /tickets/{ticketId}:
    get:
      summary: Get ticket details (Customer)
      tags:
        - Tickets
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Ticket details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /tickets/{ticketId}/messages:
    post:
      summary: Add message to ticket (Customer)
      tags:
        - Tickets
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - text
              properties:
                text:
                  type: string
                attachment:
                  type: string
      responses:
        '201':
          description: Message added
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /tickets/{ticketId}/attachments:
    post:
      summary: Upload attachment (Customer)
      tags:
        - Tickets
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '200':
          description: Upload successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      url:
                        type: string

  /support/tickets:
    get:
      summary: List assigned tickets (Support)
      tags:
        - Support
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of tickets
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'

  /support/tickets/{ticketId}:
    get:
      summary: Get ticket details (Support)
      tags:
        - Support
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Ticket details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /support/tickets/{ticketId}/attachments:
    post:
      summary: Upload attachment (Support)
      tags:
        - Support
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '200':
          description: Upload successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      url:
                        type: string

  /support/tickets/{ticketId}/assign:
    patch:
      summary: Assign ticket (Support/Admin)
      tags:
        - Support
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - assignedToUserId
              properties:
                assignedToUserId:
                  type: string
      responses:
        '200':
          description: Ticket assigned
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /support/tickets/{ticketId}/status:
    patch:
      summary: Update ticket status (Support/Admin)
      tags:
        - Support
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - status
              properties:
                status:
                  type: string
                  enum: [OPEN, PENDING, ANSWERED, CLOSED]
      responses:
        '200':
          description: Status updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /support/tickets/{ticketId}/messages:
    post:
      summary: Add message to ticket (Support)
      tags:
        - Support
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - text
              properties:
                text:
                  type: string
                attachment:
                  type: string
      responses:
        '201':
          description: Message added
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /admin/tickets:
    get:
      summary: List all tickets (Admin)
      tags:
        - Admin
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of tickets
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pagination'

  /admin/tickets/statistics:
    get:
      summary: Get ticket statistics (Admin)
      tags:
        - Admin
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Statistics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /admin/tickets/{ticketId}/assign:
    patch:
      summary: Assign ticket (Admin)
      tags:
        - Admin
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - assignedToUserId
              properties:
                assignedToUserId:
                  type: string
      responses:
        '200':
          description: Ticket assigned
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'

  /admin/tickets/{ticketId}/status:
    patch:
      summary: Update ticket status (Admin)
      tags:
        - Admin
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - status
              properties:
                status:
                  type: string
                  enum: [OPEN, PENDING, ANSWERED, CLOSED]
      responses:
        '200':
          description: Status updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Success'