{
  "openapi": "3.0.0",
  "info": {
    "title": "Playenest API",
    "description": "API Documentation for Playenest Gamenet Management System",
    "version": "v1.0-LOCKED",
    "x-api-contract-version": "v1.0-LOCKED",
    "contact": {
      "name": "Playenest Support",
      "email": "support@playenest.com"
    }
  },
  "servers": [
    {
      "url": "/api/v1",
      "description": "V1 API"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT Bearer Token for authenticated user sessions"
      },
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "x-api-key",
        "description": "Static API Key required for /api/v1 endpoints"
      }
    },
    "responses": {
      "UnauthorizedError": {
        "description": "Access token is missing or invalid",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "ForbiddenError": {
        "description": "Insufficient permissions",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "NotFoundError": {
        "description": "The requested resource was not found",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "ValidationError": {
        "description": "Invalid request payload",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "InternalServerError": {
        "description": "Unexpected server error",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "error": {
            "type": "object",
            "properties": {
              "code": {
                "type": "string",
                "description": "Unique error code for machine handling",
                "enum": [
                  "INTERNAL_ERROR",
                  "APP_ERROR",
                  "VALIDATION_ERROR",
                  "DB_REQUEST_FAILED",
                  "NOT_FOUND",
                  "CONFLICT",
                  "UNAUTHORIZED",
                  "FORBIDDEN",
                  "SLOT_NOT_AVAILABLE",
                  "RESERVATION_OVERLAP",
                  "OVERLAP_CONFLICT",
                  "RESERVATION_START_TIME_IN_PAST",
                  "INVALID_TRANSITION",
                  "ONLINE_RESERVATION_DISABLED",
                  "IDEMPOTENCY_KEY_REQUIRED",
                  "IDEMPOTENCY_KEY_INVALID_LENGTH",
                  "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
                  "IDEMPOTENCY_REQUEST_IN_PROGRESS"
                ],
                "example": "VALIDATION_ERROR"
              },
              "message": {
                "type": "string",
                "description": "Human-readable error message",
                "example": "Invalid request payload."
              },
              "details": {
                "type": "object",
                "description": "Optional additional error details (e.g., validation issues)",
                "nullable": true
              }
            }
          },
          "meta": {
            "$ref": "#/components/schemas/Meta"
          }
        }
      },
      "Success": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": true
          },
          "data": {
            "type": "object"
          },
          "meta": {
            "$ref": "#/components/schemas/Meta"
          }
        }
      },
      "AuthResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "data": {
            "type": "object",
            "properties": {
              "accessToken": {
                "type": "string"
              },
              "refreshToken": {
                "type": "string"
              },
              "user": {
                "$ref": "#/components/schemas/User"
              }
            }
          }
        }
      },
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "phone": {
            "type": "string"
          },
          "fullName": {
            "type": "string"
          },
          "role": {
            "type": "string",
            "enum": [
              "MANAGER",
              "SUPERVISOR",
              "STAFF",
              "TRAINEE",
              "SUPPORT",
              "ADMIN"
            ]
          },
          "isActive": {
            "type": "boolean"
          }
        }
      },
      "Ticket": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "customerAccountId": {
            "type": "string"
          },
          "assignedToUserId": {
            "type": "string",
            "nullable": true
          },
          "subject": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": [
              "OPEN",
              "PENDING",
              "ANSWERED",
              "CLOSED"
            ]
          },
          "priority": {
            "type": "string",
            "enum": [
              "LOW",
              "MEDIUM",
              "HIGH"
            ]
          },
          "category": {
            "type": "string",
            "enum": [
              "TECHNICAL",
              "FINANCIAL",
              "SALES",
              "ACCOUNT"
            ]
          },
          "closedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "messages": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TicketMessage"
            }
          }
        }
      },
      "TicketMessage": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "ticketId": {
            "type": "string"
          },
          "senderId": {
            "type": "string"
          },
          "senderType": {
            "type": "string",
            "enum": [
              "USER",
              "SUPPORT"
            ]
          },
          "text": {
            "type": "string"
          },
          "attachment": {
            "type": "string",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "GamingCenter": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "isActive": {
            "type": "boolean"
          },
          "description": {
            "type": "string"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "GameStation": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "stationType": {
            "type": "string",
            "enum": [
              "PC",
              "PLAYSTATION",
              "XBOX",
              "SWITCH",
              "VR"
            ]
          },
          "isVip": {
            "type": "boolean"
          },
          "hourlyPrice": {
            "type": "number"
          },
          "minRentHours": {
            "type": "integer"
          },
          "maxRentHours": {
            "type": "integer"
          },
          "defaultDurationHours": {
            "type": "integer"
          },
          "incrementMinutes": {
            "type": "integer"
          },
          "isActive": {
            "type": "boolean"
          }
        }
      },
      "Reservation": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "stationId": {
            "type": "string"
          },
          "staffId": {
            "type": "string"
          },
          "customerAccountId": {
            "type": "string"
          },
          "startTime": {
            "type": "string",
            "format": "date-time"
          },
          "endTime": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string",
            "enum": [
              "PENDING",
              "CONFIRMED",
              "IN_PROGRESS",
              "COMPLETED",
              "CANCELED",
              "NO_SHOW"
            ]
          },
          "paymentState": {
            "type": "string",
            "enum": [
              "UNPAID",
              "PENDING",
              "PARTIALLY_PAID",
              "PAID",
              "REFUNDED",
              "OVERPAID",
              "FAILED",
              "CANCELED"
            ]
          },
          "totalHours": {
            "type": "number"
          },
          "totalPrice": {
            "type": "number"
          },
          "stationSnapshot": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string"
              },
              "hourlyPrice": {
                "type": "number"
              },
              "stationType": {
                "type": "string"
              }
            }
          }
        }
      },
      "ReservationTimeProposal": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "reservationId": {
            "type": "string"
          },
          "originalStartTime": {
            "type": "string",
            "format": "date-time"
          },
          "originalEndTime": {
            "type": "string",
            "format": "date-time"
          },
          "proposedStartTime": {
            "type": "string",
            "format": "date-time"
          },
          "proposedEndTime": {
            "type": "string",
            "format": "date-time"
          },
          "note": {
            "type": "string",
            "nullable": true
          },
          "status": {
            "type": "string",
            "enum": [
              "PENDING",
              "ACCEPTED",
              "REJECTED",
              "EXPIRED",
              "CANCELLED"
            ]
          },
          "createdByUserId": {
            "type": "string"
          },
          "customerRespondedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "Staff": {
        "type": "object",
        "allOf": [
          {
            "$ref": "#/components/schemas/User"
          },
          {
            "type": "object",
            "properties": {
              "isPublic": {
                "type": "boolean"
              },
              "publicName": {
                "type": "string"
              },
              "bio": {
                "type": "string"
              },
              "avatarUrl": {
                "type": "string"
              }
            }
          }
        ]
      },
      "Customer": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "phone": {
            "type": "string"
          },
          "fullName": {
            "type": "string"
          },
          "phoneVerifiedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "Meta": {
        "type": "object",
        "properties": {
          "requestId": {
            "type": "string",
            "example": "ckv1abc..."
          },
          "pagination": {
            "type": "object",
            "properties": {
              "totalItems": {
                "type": "integer"
              },
              "page": {
                "type": "integer"
              },
              "pageSize": {
                "type": "integer"
              },
              "limit": {
                "type": "integer"
              },
              "total": {
                "type": "integer"
              },
              "totalPages": {
                "type": "integer"
              }
            }
          }
        }
      },
      "Pagination": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": true
          },
          "data": {
            "type": "array",
            "items": {
              "type": "object"
            }
          },
          "meta": {
            "$ref": "#/components/schemas/Meta"
          }
        }
      },
      "Settings": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "timeZone": {
            "type": "string"
          },
          "workStartTime": {
            "type": "string"
          },
          "workEndTime": {
            "type": "string"
          },
          "allowOnlineBooking": {
            "type": "boolean"
          },
          "onlineBookingAutoConfirm": {
            "type": "boolean"
          },
          "preventOverlaps": {
            "type": "boolean"
          }
        }
      },
      "SiteSettings": {
        "type": "object",
        "properties": {
          "logoUrl": {
            "type": "string"
          },
          "faviconUrl": {
            "type": "string"
          },
          "defaultSeoTitle": {
            "type": "string"
          },
          "defaultSeoDescription": {
            "type": "string"
          },
          "robotsIndex": {
            "type": "string",
            "enum": [
              "INDEX",
              "NOINDEX"
            ]
          },
          "robotsFollow": {
            "type": "string",
            "enum": [
              "FOLLOW",
              "NOFOLLOW"
            ]
          }
        }
      },
      "CommissionPolicy": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "PERCENT",
              "FIXED"
            ]
          },
          "percentBps": {
            "type": "integer"
          },
          "fixedAmount": {
            "type": "integer"
          },
          "currency": {
            "type": "string"
          },
          "monthlyTarget": {
            "type": "integer",
            "nullable": true
          },
          "maxPercentBps": {
            "type": "integer"
          },
          "isActive": {
            "type": "boolean"
          }
        }
      },
      "Earning": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "reservationId": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": [
              "PENDING",
              "ACCRUED",
              "CHARGED",
              "WAIVED",
              "REFUNDED"
            ]
          },
          "commissionAmount": {
            "type": "integer"
          },
          "currency": {
            "type": "string"
          },
          "targetPeriod": {
            "type": "string",
            "nullable": true
          },
          "targetReached": {
            "type": "boolean"
          },
          "targetContribution": {
            "type": "boolean"
          }
        }
      },
      "Rating": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "reservationId": {
            "type": "string"
          },
          "rating": {
            "type": "integer"
          },
          "comment": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": [
              "PUBLISHED",
              "HIDDEN",
              "DELETED"
            ]
          }
        }
      },
      "Notification": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "userId": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "RESERVATION_CREATED",
              "RESERVATION_CONFIRMED",
              "RESERVATION_REJECTED",
              "RESERVATION_CANCELLED",
              "RESERVATION_TIME_PROPOSED"
            ]
          },
          "title": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "isRead": {
            "type": "boolean"
          },
          "metadata": {
            "type": "object",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "Discount": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "targetType": {
            "type": "string",
            "enum": [
              "GAMING_CENTER",
              "STATION"
            ]
          },
          "targetId": {
            "type": "string"
          },
          "valueType": {
            "type": "string",
            "enum": [
              "PERCENTAGE",
              "FIXED_AMOUNT"
            ]
          },
          "value": {
            "type": "number"
          },
          "startAt": {
            "type": "string",
            "format": "date-time"
          },
          "endAt": {
            "type": "string",
            "format": "date-time"
          },
          "isActive": {
            "type": "boolean"
          },
          "createdByUserId": {
            "type": "string"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "WaitlistEntry": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "customerAccountId": {
            "type": "string"
          },
          "customerProfileId": {
            "type": "string"
          },
          "stationId": {
            "type": "string"
          },
          "startTime": {
            "type": "string",
            "format": "date-time"
          },
          "endTime": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string",
            "enum": [
              "ACTIVE",
              "OFFERED",
              "CONVERTED",
              "CANCELLED",
              "EXPIRED",
              "CLOSED"
            ]
          },
          "note": {
            "type": "string",
            "nullable": true
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "convertedReservationId": {
            "type": "string",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "WaitlistOffer": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "waitlistEntryId": {
            "type": "string"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "stationId": {
            "type": "string"
          },
          "offeredStartTime": {
            "type": "string",
            "format": "date-time"
          },
          "offeredEndTime": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string",
            "enum": [
              "PENDING",
              "ACCEPTED",
              "REJECTED",
              "EXPIRED",
              "CANCELLED"
            ]
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time"
          },
          "reservationId": {
            "type": "string",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "BlogPost": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "clh1234560000yy0812345678"
          },
          "gamingCenterId": {
            "type": "string",
            "example": "clh1234560000yy0887654321"
          },
          "slug": {
            "type": "string",
            "example": "esports-tournament-2026"
          },
          "title": {
            "type": "string",
            "example": "Annual Esports Tournament 2026"
          },
          "excerpt": {
            "type": "string",
            "example": "Join us for the ultimate gaming showdown."
          },
          "content": {
            "type": "string",
            "example": "\u003Cp\u003EFull HTML or Markdown article content...\u003C/p\u003E"
          },
          "status": {
            "type": "string",
            "enum": [
              "DRAFT",
              "PUBLISHED",
              "ARCHIVED"
            ],
            "default": "DRAFT"
          },
          "visibility": {
            "type": "string",
            "enum": [
              "PUBLIC",
              "PRIVATE",
              "MEMBERS_ONLY"
            ],
            "default": "PUBLIC"
          },
          "isHot": {
            "type": "boolean",
            "default": false
          },
          "isActive": {
            "type": "boolean",
            "default": true
          },
          "authorId": {
            "type": "string",
            "example": "clh1234560000yy0811111111"
          },
          "categoryId": {
            "type": "string",
            "nullable": true,
            "example": "clh1234560000yy0822222222"
          },
          "seriesId": {
            "type": "string",
            "nullable": true,
            "example": "clh1234560000yy0833333333"
          },
          "coverMediaId": {
            "type": "string",
            "nullable": true,
            "example": "clh1234560000yy0844444444"
          },
          "ogImageId": {
            "type": "string",
            "nullable": true,
            "example": "clh1234560000yy0855555555"
          },
          "seoTitle": {
            "type": "string",
            "nullable": true,
            "example": "Esports Tournament 2026 - PlayNest"
          },
          "seoDescription": {
            "type": "string",
            "nullable": true,
            "example": "Official announcement and details for 2026 tournament."
          },
          "publishedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "scheduledAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          },
          "tags": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/BlogTag"
            }
          }
        }
      },
      "BlogSeries": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "clh1234560000yy0833333333"
          },
          "gamingCenterId": {
            "type": "string",
            "example": "clh1234560000yy0887654321"
          },
          "slug": {
            "type": "string",
            "example": "setup-guides"
          },
          "title": {
            "type": "string",
            "example": "Gaming Gear Setup Guides"
          },
          "description": {
            "type": "string",
            "nullable": true,
            "example": "Step-by-step guides for optimizing gaming hardware."
          },
          "orderStrategy": {
            "type": "string",
            "enum": [
              "MANUAL",
              "CHRONOLOGICAL",
              "REVERSE_CHRONOLOGICAL"
            ],
            "default": "MANUAL"
          },
          "isActive": {
            "type": "boolean",
            "default": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "BlogCategory": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "clh1234560000yy0822222222"
          },
          "gamingCenterId": {
            "type": "string",
            "example": "clh1234560000yy0887654321"
          },
          "name": {
            "type": "string",
            "example": "Tournaments"
          },
          "slug": {
            "type": "string",
            "example": "tournaments"
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "parentId": {
            "type": "string",
            "nullable": true
          },
          "order": {
            "type": "integer",
            "default": 0
          },
          "isActive": {
            "type": "boolean",
            "default": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "BlogTag": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "clh1234560000yy0866666666"
          },
          "gamingCenterId": {
            "type": "string",
            "example": "clh1234560000yy0887654321"
          },
          "name": {
            "type": "string",
            "example": "Esports"
          },
          "slug": {
            "type": "string",
            "example": "esports"
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "isActive": {
            "type": "boolean",
            "default": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "BlogComment": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "clh1234560000yy0877777777"
          },
          "gamingCenterId": {
            "type": "string",
            "example": "clh1234560000yy0887654321"
          },
          "postId": {
            "type": "string",
            "example": "clh1234560000yy0812345678"
          },
          "parentId": {
            "type": "string",
            "nullable": true,
            "example": "clh1234560000yy0899999999"
          },
          "authorId": {
            "type": "string",
            "example": "clh1234560000yy0811111111"
          },
          "content": {
            "type": "string",
            "example": "Great article! Looking forward to the tournament."
          },
          "status": {
            "type": "string",
            "enum": [
              "PENDING",
              "APPROVED",
              "REJECTED",
              "FLAGGED",
              "SPAM"
            ],
            "default": "PENDING"
          },
          "isPinned": {
            "type": "boolean",
            "default": false
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "BlogReactionAggregate": {
        "type": "object",
        "properties": {
          "contentType": {
            "type": "string",
            "enum": [
              "post",
              "comment"
            ]
          },
          "objectId": {
            "type": "string"
          },
          "counts": {
            "type": "object",
            "additionalProperties": {
              "type": "integer"
            },
            "example": {
              "LIKE": 12,
              "LOVE": 5,
              "FIRE": 3
            }
          }
        }
      },
      "BlogMenu": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "clh1234560000yy0800000001"
          },
          "gamingCenterId": {
            "type": "string"
          },
          "name": {
            "type": "string",
            "example": "Main Navigation"
          },
          "location": {
            "type": "string",
            "enum": [
              "HEADER",
              "FOOTER",
              "SIDEBAR",
              "MOBILE_DRAWER"
            ]
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "BlogMenuItem": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "clh1234560000yy0800000002"
          },
          "menuId": {
            "type": "string"
          },
          "parentId": {
            "type": "string",
            "nullable": true
          },
          "label": {
            "type": "string",
            "example": "Blog"
          },
          "url": {
            "type": "string",
            "example": "/blog"
          },
          "order": {
            "type": "integer",
            "default": 0
          },
          "targetBlank": {
            "type": "boolean",
            "default": false
          },
          "isActive": {
            "type": "boolean",
            "default": true
          },
          "targetType": {
            "type": "string",
            "enum": [
              "CUSTOM",
              "POST",
              "CATEGORY",
              "TAG",
              "SERIES",
              "PAGE",
              "EXTERNAL"
            ],
            "default": "CUSTOM"
          },
          "targetId": {
            "type": "string",
            "nullable": true
          },
          "visibility": {
            "type": "string",
            "enum": [
              "EVERYONE",
              "GUESTS_ONLY",
              "LOGGED_IN_ONLY",
              "MEMBERS_ONLY"
            ],
            "default": "EVERYONE"
          }
        }
      }
    }
  },
  "paths": {
    "/health": {
      "get": {
        "summary": "Health Check",
        "tags": [
          "System"
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "500": {
            "$ref": "#/components/responses/InternalServerError"
          }
        },
        "operationId": "get_health",
        "description": "Health Check"
      }
    },
    "/gamingCenters/{gamingCenterId}/discounts": {
      "get": {
        "summary": "List discounts",
        "tags": [
          "Discounts"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "targetType",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "GAMING_CENTER",
                "STATION"
              ]
            }
          },
          {
            "name": "targetId",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "isActive",
            "in": "query",
            "schema": {
              "type": "boolean"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of discounts",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Discount"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          },
          "403": {
            "$ref": "#/components/responses/ForbiddenError"
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_discounts",
        "description": "List discounts"
      },
      "post": {
        "summary": "Create a new discount",
        "tags": [
          "Discounts"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "targetType",
                  "targetId",
                  "valueType",
                  "value",
                  "startAt",
                  "endAt"
                ],
                "properties": {
                  "targetType": {
                    "type": "string",
                    "enum": [
                      "GAMING_CENTER",
                      "STATION"
                    ]
                  },
                  "targetId": {
                    "type": "string"
                  },
                  "valueType": {
                    "type": "string",
                    "enum": [
                      "PERCENTAGE",
                      "FIXED_AMOUNT"
                    ]
                  },
                  "value": {
                    "type": "number"
                  },
                  "startAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "endAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Discount created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          },
          "403": {
            "$ref": "#/components/responses/ForbiddenError"
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_discounts",
        "description": "Create a new discount"
      }
    },
    "/gamingCenters/{gamingCenterId}/discounts/{id}": {
      "get": {
        "summary": "Get discount by ID",
        "tags": [
          "Discounts"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Discount details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/Discount"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          },
          "403": {
            "$ref": "#/components/responses/ForbiddenError"
          },
          "404": {
            "$ref": "#/components/responses/NotFoundError"
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_discounts_id",
        "description": "Get discount by ID"
      },
      "patch": {
        "summary": "Update discount details",
        "tags": [
          "Discounts"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "targetType": {
                    "type": "string",
                    "enum": [
                      "GAMING_CENTER",
                      "STATION"
                    ]
                  },
                  "targetId": {
                    "type": "string"
                  },
                  "valueType": {
                    "type": "string",
                    "enum": [
                      "PERCENTAGE",
                      "FIXED_AMOUNT"
                    ]
                  },
                  "value": {
                    "type": "number"
                  },
                  "startAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "endAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Discount updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          },
          "403": {
            "$ref": "#/components/responses/ForbiddenError"
          },
          "404": {
            "$ref": "#/components/responses/NotFoundError"
          }
        },
        "operationId": "patch_gamingCenters_gamingCenterId_discounts_id",
        "description": "Update discount details"
      },
      "delete": {
        "summary": "Delete discount",
        "tags": [
          "Discounts"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Discount deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          },
          "403": {
            "$ref": "#/components/responses/ForbiddenError"
          },
          "404": {
            "$ref": "#/components/responses/NotFoundError"
          }
        },
        "operationId": "delete_gamingCenters_gamingCenterId_discounts_id",
        "description": "Delete discount"
      }
    },
    "/gamingCenters/{gamingCenterId}/discounts/{id}/status": {
      "patch": {
        "summary": "Activate or deactivate discount",
        "tags": [
          "Discounts"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "isActive"
                ],
                "properties": {
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Discount status updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          },
          "403": {
            "$ref": "#/components/responses/ForbiddenError"
          },
          "404": {
            "$ref": "#/components/responses/NotFoundError"
          }
        },
        "operationId": "patch_gamingCenters_gamingCenterId_discounts_id_status",
        "description": "Activate or deactivate discount"
      }
    },
    "/notifications": {
      "get": {
        "summary": "Get user notifications",
        "tags": [
          "Notifications"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "isRead",
            "in": "query",
            "schema": {
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated notifications list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Notification"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          }
        },
        "operationId": "get_notifications",
        "description": "Get user notifications"
      }
    },
    "/notifications/unread-count": {
      "get": {
        "summary": "Get unread notification count",
        "tags": [
          "Notifications"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Count of unread notifications",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          }
        },
        "operationId": "get_notifications_unread-count",
        "description": "Get unread notification count"
      }
    },
    "/notifications/{id}/read": {
      "patch": {
        "summary": "Mark notification as read",
        "tags": [
          "Notifications"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Notification marked as read",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          },
          "403": {
            "$ref": "#/components/responses/ForbiddenError"
          },
          "404": {
            "$ref": "#/components/responses/NotFoundError"
          }
        },
        "operationId": "patch_notifications_id_read",
        "description": "Mark notification as read"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservation/{reservationId}/propose-time": {
      "post": {
        "summary": "Propose a new reservation time (Owner/Staff)",
        "tags": [
          "Reservation"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "startTime",
                  "endTime"
                ],
                "properties": {
                  "startTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "endTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "note": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Time proposal created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_reservation_reservationId_propose-time",
        "description": "Propose a new reservation time (Owner/Staff)"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservation/{reservationId}/proposals": {
      "get": {
        "summary": "List time proposals for reservation (Owner/Staff)",
        "tags": [
          "Reservation"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of proposals",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/ReservationTimeProposal"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_reservation_reservationId_proposals",
        "description": "List time proposals for reservation (Owner/Staff)"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/pause": {
      "post": {
        "summary": "Pause a gaming session for a reservation",
        "tags": [
          "GamingSessions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Session paused",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_reservations_reservationId_sessions_pause",
        "description": "Pause a gaming session for a reservation"
      }
    },
    "/customer/reservation/{reservationId}/proposals": {
      "get": {
        "summary": "List my reservation time proposals",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of proposals",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/ReservationTimeProposal"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_customer_reservation_reservationId_proposals",
        "description": "List my reservation time proposals"
      }
    },
    "/customer/reservation/{reservationId}/proposals/{proposalId}/accept": {
      "post": {
        "summary": "Accept a proposed reservation time",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "proposalId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Proposal accepted and reservation updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_customer_reservation_reservationId_proposals_proposalId_accept",
        "description": "Accept a proposed reservation time"
      }
    },
    "/customer/reservation/{reservationId}/proposals/{proposalId}/reject": {
      "post": {
        "summary": "Reject a proposed reservation time",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "proposalId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Proposal rejected",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_customer_reservation_reservationId_proposals_proposalId_reject",
        "description": "Reject a proposed reservation time"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/resume": {
      "post": {
        "summary": "Resume a gaming session for a reservation",
        "tags": [
          "GamingSessions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Session resumed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_reservations_reservationId_sessions_resume",
        "description": "Resume a gaming session for a reservation"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/summary": {
      "get": {
        "summary": "Get analytics summary",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Analytics summary",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_summary",
        "description": "Get analytics summary"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/staff": {
      "get": {
        "summary": "Get staff performance analytics",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Staff performance data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_staff",
        "description": "Get staff performance analytics"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/stations": {
      "get": {
        "summary": "Get station performance analytics",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "GameStation performance data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_stations",
        "description": "Get station performance analytics"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/revenue-chart": {
      "get": {
        "summary": "Get revenue chart data",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Revenue over time data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_revenue-chart",
        "description": "Get revenue chart data"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/reservations": {
      "get": {
        "summary": "Get detailed reservation analytics and status breakdown",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reservation analytics and metrics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_reservations",
        "description": "Get detailed reservation analytics and status breakdown"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/financials": {
      "get": {
        "summary": "Get financial reporting and payment distribution analytics",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "currency",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Financial analytics and breakdown",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_financials",
        "description": "Get financial reporting and payment distribution analytics"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/operations/waitlist": {
      "get": {
        "summary": "Get waitlist conversion and activity metrics",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Waitlist operational metrics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_operations_waitlist",
        "description": "Get waitlist conversion and activity metrics"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/operations/notifications": {
      "get": {
        "summary": "Get notification dispatch and failure summaries",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Notification dispatch operational metrics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_operations_notifications",
        "description": "Get notification dispatch and failure summaries"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/benchmarks": {
      "get": {
        "summary": "Get privacy-preserving aggregate benchmarks",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "peerGroupCategory",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "STANDARD",
                "PREMIUM"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Privacy-preserving benchmark metrics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_benchmarks",
        "description": "Get privacy-preserving peer benchmark aggregates for eligible metrics"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/growth-insights": {
      "get": {
        "summary": "Get descriptive growth insights",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "peerGroupCategory",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "STANDARD",
                "PREMIUM"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Descriptive growth insights based on historical metrics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_growth_insights",
        "description": "Get descriptive operational growth insights and benchmark comparisons"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/customers/summary": {
      "get": {
        "summary": "Get customer analytics summary and distinct entity taxonomy",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Customer summary analytics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_customers_summary",
        "description": "Get customer analytics summary with explicit entity taxonomy breakdown"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/customers/activity": {
      "get": {
        "summary": "Get customer activity trends and visit frequency histogram",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Customer activity trends",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_customers_activity",
        "description": "Get daily customer activity trends and visit frequency distribution"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/customers/retention": {
      "get": {
        "summary": "Get customer cohort retention matrix",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Cohort retention matrix",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_customers_retention",
        "description": "Get monthly customer cohort retention rates and repeat visit intervals"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/customers/segmentation": {
      "get": {
        "summary": "Get customer segmentation",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Customer segmentation breakdown",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_customers_segmentation",
        "description": "Get customer segments (New, Repeat, VIP, At-Risk)"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/customers/top-spenders": {
      "get": {
        "summary": "Get top customer spenders with masked phone numbers",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Top customer spenders",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_customers_top_spenders",
        "description": "Get top spending customers with privacy masking"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/financials/overview": {
      "get": {
        "summary": "Get detailed financial overview across ledger, payments, and refunds",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detailed financial overview",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_financials_overview",
        "description": "Get comprehensive financial overview"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/financials/reconciliation": {
      "get": {
        "summary": "Get financial reconciliation findings and discrepancies",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Financial reconciliation findings",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_financials_reconciliation",
        "description": "Get financial reconciliation findings"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/funnel": {
      "get": {
        "summary": "Get operational conversion funnel and web gap notice",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Operational conversion funnel",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_funnel",
        "description": "Get operational reservation-to-completion conversion funnel"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/discounts": {
      "get": {
        "summary": "Get discount code usage and performance comparison",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Discount performance analytics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_discounts",
        "description": "Get discount performance comparison and voucher breakdown"
      }
    },
    "/gamingCenters/{gamingCenterId}/analytics/instrumentation-gaps": {
      "get": {
        "summary": "Get instrumentation gap catalog and web event specification",
        "tags": [
          "Analytics"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Instrumentation gap specifications",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_analytics_instrumentation_gaps",
        "description": "Get instrumentation gaps and web event collector specification"
      }
    },
    "/gamingCenters/{gamingCenterId}/settings": {
      "get": {
        "summary": "Get gamingCenter settings",
        "tags": [
          "Settings"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "GamingCenter settings",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/Settings"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_settings",
        "description": "Get gamingCenter settings"
      },
      "put": {
        "summary": "Update gamingCenter settings",
        "tags": [
          "Settings"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "timeZone": {
                    "type": "string"
                  },
                  "workStartTime": {
                    "type": "string"
                  },
                  "workEndTime": {
                    "type": "string"
                  },
                  "allowOnlineBooking": {
                    "type": "boolean"
                  },
                  "onlineBookingAutoConfirm": {
                    "type": "boolean"
                  },
                  "preventOverlaps": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Settings updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "put_gamingCenters_gamingCenterId_settings",
        "description": "Update gamingCenter settings"
      }
    },
    "/gamingCenters/{gamingCenterId}/commissions": {
      "get": {
        "summary": "List reservation earnings (commissions)",
        "tags": [
          "Commissions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "status",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "PENDING",
                "ACCRUED",
                "CHARGED",
                "WAIVED",
                "REFUNDED"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of earnings",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Earning"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_commissions",
        "description": "List reservation earnings (commissions)"
      }
    },
    "/gamingCenters/{gamingCenterId}/commissions/target-progress": {
      "get": {
        "summary": "Get monthly commission target progress",
        "tags": [
          "Commissions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "targetPeriod",
            "in": "query",
            "schema": {
              "type": "string",
              "example": "2026-10"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Monthly target progress details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_commissions_target-progress",
        "description": "Get monthly commission target progress"
      }
    },
    "/gamingCenters/{gamingCenterId}/commissions/policy": {
      "get": {
        "summary": "Get commission policy",
        "tags": [
          "Commissions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Policy details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/CommissionPolicy"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_commissions_policy",
        "description": "Get commission policy"
      },
      "post": {
        "summary": "Upsert commission policy",
        "tags": [
          "Commissions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "type"
                ],
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": [
                      "PERCENT",
                      "FIXED"
                    ]
                  },
                  "percentBps": {
                    "type": "integer"
                  },
                  "fixedAmount": {
                    "type": "integer"
                  },
                  "currency": {
                    "type": "string"
                  },
                  "applyToOnlineOnly": {
                    "type": "boolean"
                  },
                  "minimumFeeAmount": {
                    "type": "integer"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Policy updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_commissions_policy",
        "description": "Upsert commission policy"
      }
    },
    "/gamingCenters/{gamingCenterId}/commissions/{earningId}/pay": {
      "post": {
        "summary": "Record commission payment",
        "tags": [
          "Commissions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "earningId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "amount",
                  "currency"
                ],
                "properties": {
                  "amount": {
                    "type": "integer"
                  },
                  "currency": {
                    "type": "string"
                  },
                  "status": {
                    "type": "string",
                    "enum": [
                      "PENDING",
                      "PAID",
                      "VOID",
                      "REFUNDED"
                    ],
                    "default": "PAID"
                  },
                  "method": {
                    "type": "string",
                    "enum": [
                      "CASH",
                      "CARD",
                      "ONLINE",
                      "TRANSFER"
                    ]
                  },
                  "referenceCode": {
                    "type": "string"
                  },
                  "paidAt": {
                    "type": "string",
                    "format": "date-time"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Payment recorded",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_commissions_earningId_pay",
        "description": "Record commission payment"
      }
    },
    "/gamingCenters/{gamingCenterId}/audit-logs": {
      "get": {
        "summary": "List audit logs",
        "tags": [
          "Audit"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entity",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "action",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Audit logs",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pagination"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_audit-logs",
        "description": "List audit logs"
      }
    },
    "/gamingCenters/{gamingCenterId}/site-settings": {
      "get": {
        "summary": "Get site settings",
        "tags": [
          "CMS"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Site settings",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/SiteSettings"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_site-settings",
        "description": "Get site settings"
      },
      "patch": {
        "summary": "Update site settings",
        "tags": [
          "CMS"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "logoUrl": {
                    "type": "string"
                  },
                  "faviconUrl": {
                    "type": "string"
                  },
                  "defaultSeoTitle": {
                    "type": "string"
                  },
                  "defaultSeoDescription": {
                    "type": "string"
                  },
                  "robotsIndex": {
                    "type": "string",
                    "enum": [
                      "INDEX",
                      "NOINDEX"
                    ]
                  },
                  "robotsFollow": {
                    "type": "string",
                    "enum": [
                      "FOLLOW",
                      "NOFOLLOW"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Settings updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_gamingCenters_gamingCenterId_site-settings",
        "description": "Update site settings"
      }
    },
    "/gamingCenters/{gamingCenterId}/ratings/{id}/status": {
      "patch": {
        "summary": "Moderate a review (status update)",
        "tags": [
          "Ratings"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "status"
                ],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "PUBLISHED",
                      "HIDDEN",
                      "DELETED"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Status updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_gamingCenters_gamingCenterId_ratings_id_status",
        "description": "Moderate a review (status update)"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}": {
      "get": {
        "summary": "Get public gaming center info",
        "tags": [
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Gaming center details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/GamingCenter"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_public_gamingCenters_gamingCenterSlug",
        "description": "Get public gaming center info"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/pages/{pageSlug}": {
      "get": {
        "summary": "Get a public page by slug",
        "tags": [
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "pageSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Page details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_public_gamingCenters_gamingCenterSlug_pages_pageSlug",
        "description": "Get a public page by slug"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/media": {
      "get": {
        "summary": "Get public media",
        "tags": [
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Media list",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_public_gamingCenters_gamingCenterSlug_media",
        "description": "Get public media"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/links": {
      "get": {
        "summary": "Get public social links",
        "tags": [
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Links list",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_public_gamingCenters_gamingCenterSlug_links",
        "description": "Get public social links"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/addresses": {
      "get": {
        "summary": "Get public addresses",
        "tags": [
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Address list",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_public_gamingCenters_gamingCenterSlug_addresses",
        "description": "Get public addresses"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/ratings": {
      "get": {
        "summary": "List public ratings",
        "tags": [
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Ratings list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Rating"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_public_gamingCenters_gamingCenterSlug_ratings",
        "description": "List public ratings"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/reservation/{reservationId}/ratings": {
      "post": {
        "summary": "Submit a review",
        "tags": [
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "rating"
                ],
                "properties": {
                  "rating": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5
                  },
                  "comment": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Review submitted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_public_gamingCenters_gamingCenterSlug_reservation_reservationId_ratings",
        "description": "Submit a review"
      }
    },
    "/gamingCenters/{gamingCenterId}/media/upload": {
      "post": {
        "summary": "Upload an image",
        "tags": [
          "CMS"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "file"
                ],
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  },
                  "purpose": {
                    "type": "string",
                    "enum": [
                      "COVER",
                      "GALLERY",
                      "STATION",
                      "LOGO"
                    ]
                  },
                  "altText": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Image uploaded",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_media_upload",
        "description": "Upload an image"
      }
    },
    "/gamingCenters/{gamingCenterId}/customers": {
      "get": {
        "summary": "List customers for a gamingCenter",
        "tags": [
          "Customers"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "search",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of customers",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pagination"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_customers",
        "description": "List customers for a gamingCenter"
      },
      "post": {
        "summary": "Create or link a customer",
        "tags": [
          "Customers"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone"
                ],
                "properties": {
                  "phone": {
                    "type": "string"
                  },
                  "fullName": {
                    "type": "string"
                  },
                  "displayName": {
                    "type": "string"
                  },
                  "note": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Customer created or linked",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_customers",
        "description": "Create or link a customer"
      }
    },
    "/gamingCenters/{gamingCenterId}/customers/{customerId}": {
      "patch": {
        "summary": "Update customer profile",
        "tags": [
          "Customers"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "customerId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "displayName": {
                    "type": "string"
                  },
                  "note": {
                    "type": "string"
                  },
                  "fullName": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Customer updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_gamingCenters_gamingCenterId_customers_customerId",
        "description": "Update customer profile"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/availability/slots": {
      "get": {
        "summary": "Get available slots",
        "tags": [
          "Availability"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "date",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "stationId",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Available slots",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_public_gamingCenters_gamingCenterSlug_availability_slots",
        "description": "Get available slots"
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/reservation": {
      "post": {
        "summary": "Create an online reservation",
        "tags": [
          "Reservation"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "idempotency-key",
            "in": "header",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "stationId",
                  "startTime",
                  "customer"
                ],
                "properties": {
                  "stationId": {
                    "type": "string"
                  },
                  "staffId": {
                    "type": "string"
                  },
                  "startTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "customer": {
                    "type": "object",
                    "required": [
                      "fullName",
                      "phone"
                    ],
                    "properties": {
                      "fullName": {
                        "type": "string"
                      },
                      "phone": {
                        "type": "string"
                      },
                      "email": {
                        "type": "string"
                      }
                    }
                  },
                  "note": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Reservation created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_public_gamingCenters_gamingCenterSlug_reservation",
        "description": "Create an online reservation"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservation": {
      "get": {
        "summary": "List reservation for a gamingCenter",
        "tags": [
          "Reservation"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "status",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "PENDING",
                "CONFIRMED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELED",
                "NO_SHOW"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of reservation",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pagination"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_reservation",
        "description": "List reservation for a gamingCenter"
      },
      "post": {
        "summary": "Create a reservation (Panel)",
        "tags": [
          "Reservation"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "stationId",
                  "startTime",
                  "customer"
                ],
                "properties": {
                  "stationId": {
                    "type": "string"
                  },
                  "staffId": {
                    "type": "string"
                  },
                  "startTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "customer": {
                    "type": "object",
                    "required": [
                      "fullName",
                      "phone"
                    ],
                    "properties": {
                      "fullName": {
                        "type": "string"
                      },
                      "phone": {
                        "type": "string"
                      }
                    }
                  },
                  "note": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Reservation created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_reservation",
        "description": "Create a reservation (Panel)"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservation/{reservationId}": {
      "get": {
        "summary": "Get reservation by ID",
        "tags": [
          "Reservation"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reservation details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/Reservation"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_reservation_reservationId",
        "description": "Get reservation by ID"
      },
      "patch": {
        "summary": "Update reservation details",
        "tags": [
          "Reservation"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "stationId": {
                    "type": "string"
                  },
                  "staffId": {
                    "type": "string"
                  },
                  "startTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "note": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reservation updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_gamingCenters_gamingCenterId_reservation_reservationId",
        "description": "Update reservation details"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/start": {
      "post": {
        "summary": "Start a gaming session for a reservation",
        "tags": [
          "GamingSessions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "stationId": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Session started",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_reservation_reservationId_sessions_start",
        "description": "Start a gaming session for a reservation"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/stop": {
      "post": {
        "summary": "Stop a gaming session for a reservation",
        "tags": [
          "GamingSessions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Session stopped",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_reservation_reservationId_sessions_stop",
        "description": "Stop a gaming session for a reservation"
      }
    },
    "/gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init": {
      "post": {
        "summary": "Initiate payment for reservation",
        "tags": [
          "Payments"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "idempotency-key",
            "in": "header",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Payment initiated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_reservation_reservationId_payments_init",
        "description": "Initiate payment for reservation"
      }
    },
    "/customer/me": {
      "get": {
        "summary": "Get current customer info",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Customer info",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/Customer"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_customer_me",
        "description": "Get current customer info"
      }
    },
    "/customer/reservation": {
      "get": {
        "summary": "List my reservation",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of reservation",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pagination"
                }
              }
            }
          }
        },
        "operationId": "get_customer_reservation",
        "description": "List my reservation"
      }
    },
    "/customer/reservation/{reservationId}": {
      "get": {
        "summary": "Get reservation details",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reservation details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_customer_reservation_reservationId",
        "description": "Get reservation details"
      }
    },
    "/customer/reservation/{reservationId}/cancel": {
      "post": {
        "summary": "Cancel my reservation",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reservation canceled",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_customer_reservation_reservationId_cancel",
        "description": "Cancel my reservation"
      }
    },
    "/customer/reservation/{reservationId}/ratings": {
      "post": {
        "summary": "Submit a review (customer panel)",
        "tags": [
          "Customer Panel"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "reservationId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "rating"
                ],
                "properties": {
                  "rating": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5
                  },
                  "comment": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Review submitted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_customer_reservation_reservationId_ratings",
        "description": "Submit a review (customer panel)"
      }
    },
    "/gamingCenters/{gamingCenterId}/staff": {
      "get": {
        "summary": "List staff for a gamingCenter",
        "tags": [
          "Staff"
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of staff",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Staff"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_staff",
        "description": "List staff for a gamingCenter"
      },
      "post": {
        "summary": "Add new staff member",
        "tags": [
          "Staff"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "fullName",
                  "phone",
                  "role"
                ],
                "properties": {
                  "fullName": {
                    "type": "string"
                  },
                  "phone": {
                    "type": "string"
                  },
                  "role": {
                    "type": "string",
                    "enum": [
                      "MANAGER",
                      "SUPERVISOR",
                      "STAFF",
                      "TRAINEE"
                    ]
                  },
                  "isPublic": {
                    "type": "boolean"
                  },
                  "publicName": {
                    "type": "string"
                  },
                  "bio": {
                    "type": "string"
                  },
                  "avatarUrl": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Staff member added",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_staff",
        "description": "Add new staff member"
      }
    },
    "/gamingCenters/{gamingCenterId}/stations": {
      "get": {
        "summary": "List stations for a gamingCenter",
        "tags": [
          "Stations"
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of stations",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/GameStation"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters_gamingCenterId_stations",
        "description": "List stations for a gamingCenter"
      },
      "post": {
        "summary": "Create a new station",
        "tags": [
          "Stations"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "stationType",
                  "hourlyPrice"
                ],
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "stationType": {
                    "type": "string",
                    "enum": [
                      "PC",
                      "PLAYSTATION",
                      "XBOX",
                      "SWITCH",
                      "VR"
                    ]
                  },
                  "hourlyPrice": {
                    "type": "number"
                  },
                  "minRentHours": {
                    "type": "integer"
                  },
                  "maxRentHours": {
                    "type": "integer"
                  },
                  "defaultDurationHours": {
                    "type": "integer"
                  },
                  "incrementMinutes": {
                    "type": "integer"
                  },
                  "isVip": {
                    "type": "boolean"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "GameStation created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters_gamingCenterId_stations",
        "description": "Create a new station"
      }
    },
    "/gamingCenters": {
      "get": {
        "summary": "List all gamingCenters",
        "tags": [
          "GamingCenters"
        ],
        "responses": {
          "200": {
            "description": "List of gamingCenters",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pagination"
                }
              }
            }
          }
        },
        "operationId": "get_gamingCenters",
        "description": "List all gamingCenters"
      },
      "post": {
        "summary": "Create a new gamingCenter",
        "tags": [
          "GamingCenters"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "slug",
                  "ownerId"
                ],
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "slug": {
                    "type": "string"
                  },
                  "ownerId": {
                    "type": "string"
                  },
                  "games": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "GamingCenter created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_gamingCenters",
        "description": "Create a new gamingCenter"
      }
    },
    "/auth/me": {
      "get": {
        "summary": "Get current user info",
        "tags": [
          "Auth"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "User info",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_auth_me",
        "description": "Get current user info"
      }
    },
    "/auth/customer/otp/request": {
      "post": {
        "summary": "Request OTP (Customer)",
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone"
                ],
                "properties": {
                  "phone": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP sent",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_auth_customer_otp_request",
        "description": "Request OTP (Customer)"
      }
    },
    "/auth/customer/otp/verify": {
      "post": {
        "summary": "Verify OTP (Customer)",
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone",
                  "code"
                ],
                "properties": {
                  "phone": {
                    "type": "string"
                  },
                  "code": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Verified",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AuthResponse"
                }
              }
            }
          }
        },
        "operationId": "post_auth_customer_otp_verify",
        "description": "Verify OTP (Customer)"
      }
    },
    "/tickets": {
      "get": {
        "summary": "List own tickets (Customer)",
        "tags": [
          "Tickets"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of tickets",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Ticket"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_tickets",
        "description": "List own tickets (Customer)"
      },
      "post": {
        "summary": "Create a new ticket (Customer)",
        "tags": [
          "Tickets"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "subject",
                  "message",
                  "category"
                ],
                "properties": {
                  "subject": {
                    "type": "string"
                  },
                  "message": {
                    "type": "string"
                  },
                  "priority": {
                    "type": "string",
                    "enum": [
                      "LOW",
                      "MEDIUM",
                      "HIGH"
                    ]
                  },
                  "category": {
                    "type": "string",
                    "enum": [
                      "TECHNICAL",
                      "FINANCIAL",
                      "SALES",
                      "ACCOUNT"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Ticket created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_tickets",
        "description": "Create a new ticket (Customer)"
      }
    },
    "/tickets/{ticketId}": {
      "get": {
        "summary": "Get ticket details (Customer)",
        "tags": [
          "Tickets"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Ticket details",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/Ticket"
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "get_tickets_ticketId",
        "description": "Get ticket details (Customer)"
      }
    },
    "/tickets/{ticketId}/messages": {
      "post": {
        "summary": "Add message to ticket (Customer)",
        "tags": [
          "Tickets"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "text"
                ],
                "properties": {
                  "text": {
                    "type": "string"
                  },
                  "attachment": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Message added",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_tickets_ticketId_messages",
        "description": "Add message to ticket (Customer)"
      }
    },
    "/tickets/{ticketId}/attachments": {
      "post": {
        "summary": "Upload attachment (Customer)",
        "tags": [
          "Tickets"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "file"
                ],
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Upload successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "url": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "post_tickets_ticketId_attachments",
        "description": "Upload attachment (Customer)"
      }
    },
    "/support/tickets": {
      "get": {
        "summary": "List assigned tickets (Support)",
        "tags": [
          "Support"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of tickets",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pagination"
                }
              }
            }
          }
        },
        "operationId": "get_support_tickets",
        "description": "List assigned tickets (Support)"
      }
    },
    "/support/tickets/{ticketId}": {
      "get": {
        "summary": "Get ticket details (Support)",
        "tags": [
          "Support"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Ticket details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_support_tickets_ticketId",
        "description": "Get ticket details (Support)"
      }
    },
    "/support/tickets/{ticketId}/attachments": {
      "post": {
        "summary": "Upload attachment (Support)",
        "tags": [
          "Support"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "file"
                ],
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Upload successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "url": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "operationId": "post_support_tickets_ticketId_attachments",
        "description": "Upload attachment (Support)"
      }
    },
    "/support/tickets/{ticketId}/assign": {
      "patch": {
        "summary": "Assign ticket (Support/Admin)",
        "tags": [
          "Support"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "assignedToUserId"
                ],
                "properties": {
                  "assignedToUserId": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Ticket assigned",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_support_tickets_ticketId_assign",
        "description": "Assign ticket (Support/Admin)"
      }
    },
    "/support/tickets/{ticketId}/status": {
      "patch": {
        "summary": "Update ticket status (Support/Admin)",
        "tags": [
          "Support"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "status"
                ],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "OPEN",
                      "PENDING",
                      "ANSWERED",
                      "CLOSED"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Status updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_support_tickets_ticketId_status",
        "description": "Update ticket status (Support/Admin)"
      }
    },
    "/support/tickets/{ticketId}/messages": {
      "post": {
        "summary": "Add message to ticket (Support)",
        "tags": [
          "Support"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "text"
                ],
                "properties": {
                  "text": {
                    "type": "string"
                  },
                  "attachment": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Message added",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "post_support_tickets_ticketId_messages",
        "description": "Add message to ticket (Support)"
      }
    },
    "/admin/tickets": {
      "get": {
        "summary": "List all tickets (Admin)",
        "tags": [
          "Admin"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of tickets",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pagination"
                }
              }
            }
          }
        },
        "operationId": "get_admin_tickets",
        "description": "List all tickets (Admin)"
      }
    },
    "/admin/tickets/statistics": {
      "get": {
        "summary": "Get ticket statistics (Admin)",
        "tags": [
          "Admin"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Statistics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "get_admin_tickets_statistics",
        "description": "Get ticket statistics (Admin)"
      }
    },
    "/admin/tickets/{ticketId}/assign": {
      "patch": {
        "summary": "Assign ticket (Admin)",
        "tags": [
          "Admin"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "assignedToUserId"
                ],
                "properties": {
                  "assignedToUserId": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Ticket assigned",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_admin_tickets_ticketId_assign",
        "description": "Assign ticket (Admin)"
      }
    },
    "/admin/tickets/{ticketId}/status": {
      "patch": {
        "summary": "Update ticket status (Admin)",
        "tags": [
          "Admin"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "ticketId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "status"
                ],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "OPEN",
                      "PENDING",
                      "ANSWERED",
                      "CLOSED"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Status updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        },
        "operationId": "patch_admin_tickets_ticketId_status",
        "description": "Update ticket status (Admin)"
      }
    },
    "/auth/login": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "User password login",
        "description": "Authenticate user with phone number and password",
        "operationId": "auth_login",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone",
                  "password"
                ],
                "properties": {
                  "phone": {
                    "type": "string",
                    "example": "09123456789"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "example": "SecurePass123!"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "accessToken": {
                          "type": "string"
                        },
                        "refreshToken": {
                          "type": "string"
                        },
                        "user": {
                          "type": "object"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          }
        }
      }
    },
    "/auth/refresh": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Refresh authentication token",
        "description": "Obtain new access token using a valid refresh token",
        "operationId": "auth_refresh",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "refreshToken"
                ],
                "properties": {
                  "refreshToken": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token refreshed successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "accessToken": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          }
        }
      }
    },
    "/auth/logout": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "User logout",
        "description": "Invalidate current session and logout user",
        "operationId": "auth_logout",
        "security": [
          {
            "ApiKeyAuth": [],
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Logout successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "message": {
                      "type": "string",
                      "example": "Logged out successfully"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/UnauthorizedError"
          }
        }
      }
    },
    "/auth/user/otp/request": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Request OTP for user authentication",
        "description": "Request a one-time password sent to staff/user phone number",
        "operationId": "auth_user_otp_request",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone"
                ],
                "properties": {
                  "phone": {
                    "type": "string",
                    "example": "09123456789"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP sent successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "message": {
                      "type": "string",
                      "example": "OTP sent"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/user/otp/verify": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Verify user OTP",
        "description": "Verify one-time password for user authentication",
        "operationId": "auth_user_otp_verify",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone",
                  "code"
                ],
                "properties": {
                  "phone": {
                    "type": "string",
                    "example": "09123456789"
                  },
                  "code": {
                    "type": "string",
                    "example": "123456"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP verified successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "object"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/user/login/otp": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Login user with OTP code",
        "description": "Authenticate user using verified OTP code",
        "operationId": "auth_user_login_otp",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone",
                  "code"
                ],
                "properties": {
                  "phone": {
                    "type": "string",
                    "example": "09123456789"
                  },
                  "code": {
                    "type": "string",
                    "example": "123456"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "accessToken": {
                          "type": "string"
                        },
                        "refreshToken": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/waitlist": {
      "get": {
        "summary": "List waitlist entries",
        "description": "List waitlist entries for a gaming center",
        "operationId": "get_gamingCenters_gamingCenterId_waitlist",
        "tags": [
          "Waitlist"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "status",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "OFFERED",
                "CONVERTED",
                "CANCELLED",
                "EXPIRED",
                "CLOSED"
              ]
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of waitlist entries",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/WaitlistEntry"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/waitlist/offers": {
      "get": {
        "summary": "List waitlist offers",
        "description": "List waitlist offers for a gaming center",
        "operationId": "get_gamingCenters_gamingCenterId_waitlist_offers",
        "tags": [
          "Waitlist"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of waitlist offers",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/WaitlistOffer"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/customer/waitlist": {
      "post": {
        "summary": "Create customer waitlist entry",
        "description": "Create a customer waitlist entry",
        "operationId": "post_customer_waitlist",
        "tags": [
          "Waitlist"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "stationId",
                  "startTime",
                  "endTime"
                ],
                "properties": {
                  "stationId": {
                    "type": "string"
                  },
                  "startTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "endTime": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "note": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Waitlist entry created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        }
      },
      "get": {
        "summary": "List my waitlist entries",
        "description": "List my waitlist entries",
        "operationId": "get_customer_waitlist",
        "tags": [
          "Waitlist"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of entries",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/WaitlistEntry"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/customer/waitlist/offers": {
      "get": {
        "summary": "List my waitlist offers",
        "description": "List my waitlist offers",
        "operationId": "get_customer_waitlist_offers",
        "tags": [
          "Waitlist"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of offers",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/WaitlistOffer"
                      }
                    },
                    "meta": {
                      "$ref": "#/components/schemas/Meta"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/customer/waitlist/offers/{offerId}/accept": {
      "post": {
        "summary": "Accept waitlist offer",
        "description": "Accept a waitlist offer and convert to reservation",
        "operationId": "post_customer_waitlist_offers_offerId_accept",
        "tags": [
          "Waitlist"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "offerId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Reservation created from offer",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        }
      }
    },
    "/customer/waitlist/offers/{offerId}/reject": {
      "post": {
        "summary": "Reject waitlist offer",
        "description": "Reject a waitlist offer",
        "operationId": "post_customer_waitlist_offers_offerId_reject",
        "tags": [
          "Waitlist"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "offerId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Offer rejected",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Success"
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/posts": {
      "get": {
        "summary": "List blog posts",
        "description": "Retrieve a paginated list of blog posts for a gaming center with\nfiltering by status, category, author, or search term.",
        "operationId": "get_blog_posts",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 10
            }
          },
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "DRAFT",
                "PUBLISHED",
                "ARCHIVED"
              ]
            }
          },
          {
            "name": "categoryId",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "authorId",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "isActive",
            "in": "query",
            "required": false,
            "schema": {
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogPost"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create blog post",
        "description": "Create a new blog post. Requires author role (STAFF, SUPERVISOR,\nMANAGER, ADMIN).",
        "operationId": "create_blog_post",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "slug",
                  "title",
                  "excerpt",
                  "content"
                ],
                "properties": {
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "title": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "excerpt": {
                    "type": "string",
                    "minLength": 1
                  },
                  "content": {
                    "type": "string",
                    "minLength": 1
                  },
                  "categoryId": {
                    "type": "string"
                  },
                  "seriesId": {
                    "type": "string"
                  },
                  "coverMediaId": {
                    "type": "string"
                  },
                  "ogImageId": {
                    "type": "string"
                  },
                  "seoTitle": {
                    "type": "string",
                    "maxLength": 255
                  },
                  "seoDescription": {
                    "type": "string"
                  },
                  "status": {
                    "type": "string",
                    "enum": [
                      "DRAFT",
                      "PUBLISHED",
                      "ARCHIVED"
                    ],
                    "default": "DRAFT"
                  },
                  "visibility": {
                    "type": "string",
                    "enum": [
                      "PUBLIC",
                      "PRIVATE",
                      "MEMBERS_ONLY"
                    ],
                    "default": "PUBLIC"
                  },
                  "publishedAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "scheduledAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "isHot": {
                    "type": "boolean",
                    "default": false
                  },
                  "tagIds": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "maxItems": 50
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Post created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogPost"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/posts/{id}": {
      "get": {
        "summary": "Get blog post by ID",
        "description": "Retrieve details of a single blog post by ID.",
        "operationId": "get_blog_post_by_id",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogPost"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "patch": {
        "summary": "Update blog post",
        "description": "Update an existing blog post. Authors can update their own posts;\nManagers/Admins can update any post.",
        "operationId": "update_blog_post",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "title": {
                    "type": "string"
                  },
                  "excerpt": {
                    "type": "string"
                  },
                  "content": {
                    "type": "string"
                  },
                  "categoryId": {
                    "type": "string"
                  },
                  "seriesId": {
                    "type": "string"
                  },
                  "coverMediaId": {
                    "type": "string"
                  },
                  "ogImageId": {
                    "type": "string"
                  },
                  "seoTitle": {
                    "type": "string"
                  },
                  "seoDescription": {
                    "type": "string"
                  },
                  "status": {
                    "type": "string",
                    "enum": [
                      "DRAFT",
                      "PUBLISHED",
                      "ARCHIVED"
                    ]
                  },
                  "visibility": {
                    "type": "string",
                    "enum": [
                      "PUBLIC",
                      "PRIVATE",
                      "MEMBERS_ONLY"
                    ]
                  },
                  "publishedAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "scheduledAt": {
                    "type": "string",
                    "format": "date-time"
                  },
                  "isHot": {
                    "type": "boolean"
                  },
                  "isActive": {
                    "type": "boolean"
                  },
                  "changeNote": {
                    "type": "string"
                  },
                  "tagIds": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "maxItems": 50
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogPost"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete blog post",
        "description": "Soft-delete or purge a blog post. Requires MANAGER or ADMIN role.",
        "operationId": "delete_blog_post",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Post deleted",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "message": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/posts/series": {
      "get": {
        "summary": "List blog post series",
        "description": "Retrieve all post series for a gaming center.",
        "operationId": "get_blog_series",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogSeries"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create blog post series",
        "description": "Create a new blog post series. Requires MANAGER or ADMIN role.",
        "operationId": "create_blog_series",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "slug",
                  "title"
                ],
                "properties": {
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "title": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "description": {
                    "type": "string"
                  },
                  "orderStrategy": {
                    "type": "string",
                    "enum": [
                      "MANUAL",
                      "CHRONOLOGICAL",
                      "REVERSE_CHRONOLOGICAL"
                    ],
                    "default": "MANUAL"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Series created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogSeries"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/posts/series/{id}": {
      "get": {
        "summary": "Get blog series by ID",
        "description": "Retrieve a blog series by ID with its ordered posts.",
        "operationId": "get_blog_series_by_id",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogSeries"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "patch": {
        "summary": "Update blog series",
        "description": "Update a blog series. Requires MANAGER or ADMIN role.",
        "operationId": "update_blog_series",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "title": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  },
                  "orderStrategy": {
                    "type": "string",
                    "enum": [
                      "MANUAL",
                      "CHRONOLOGICAL",
                      "REVERSE_CHRONOLOGICAL"
                    ]
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogSeries"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/comments": {
      "get": {
        "summary": "List blog comments for moderation",
        "description": "List all comments across posts for moderation. Restricted to ADMIN,\nMANAGER, SUPERVISOR.",
        "operationId": "list_blog_comments_admin",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "pageSize",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 20
            }
          },
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "PENDING",
                "APPROVED",
                "REJECTED",
                "FLAGGED",
                "SPAM"
              ]
            }
          },
          {
            "name": "postId",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogComment"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create blog comment",
        "description": "Post a comment or reply to an existing comment on a blog post.",
        "operationId": "create_blog_comment",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "postId",
                  "content"
                ],
                "properties": {
                  "postId": {
                    "type": "string"
                  },
                  "parentId": {
                    "type": "string"
                  },
                  "content": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 5000
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Comment created",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogComment"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/comments/tree": {
      "get": {
        "summary": "Get comment tree for post",
        "description": "Retrieve nested comment tree for a post.",
        "operationId": "get_blog_comment_tree",
        "tags": [
          "Blog"
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "postId",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogComment"
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/comments/{id}": {
      "patch": {
        "summary": "Update comment content",
        "description": "Update the content of an author's own comment.",
        "operationId": "update_blog_comment",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "content"
                ],
                "properties": {
                  "content": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 5000
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogComment"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete comment",
        "description": "Delete a comment.",
        "operationId": "delete_blog_comment",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Comment deleted",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "message": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/comments/{id}/moderate": {
      "patch": {
        "summary": "Moderate comment status",
        "description": "Approve, reject, or flag a comment. Restricted to ADMIN, MANAGER,\nSUPERVISOR.",
        "operationId": "moderate_blog_comment",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "status"
                ],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "PENDING",
                      "APPROVED",
                      "REJECTED",
                      "FLAGGED",
                      "SPAM"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogComment"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/comments/{id}/pin": {
      "patch": {
        "summary": "Pin or unpin comment",
        "description": "Pin or unpin a comment on a blog post. Restricted to ADMIN, MANAGER,\nSUPERVISOR.",
        "operationId": "pin_blog_comment",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogComment"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/comments/{id}/flag": {
      "post": {
        "summary": "Flag comment for moderation",
        "description": "Flag an inappropriate comment.",
        "operationId": "flag_blog_comment",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Comment flagged",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "message": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/reactions/toggle": {
      "post": {
        "summary": "Toggle reaction",
        "description": "Add or remove a reaction (e.g., LIKE, LOVE, FIRE) on a post or\ncomment.",
        "operationId": "toggle_blog_reaction",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "contentType",
                  "objectId",
                  "type"
                ],
                "properties": {
                  "contentType": {
                    "type": "string",
                    "enum": [
                      "post",
                      "comment"
                    ]
                  },
                  "objectId": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string",
                    "enum": [
                      "LIKE",
                      "DISLIKE",
                      "LOVE",
                      "FIRE",
                      "CLAP",
                      "LAUGH",
                      "SAD",
                      "THINKING"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "reacted": {
                              "type": "boolean"
                            },
                            "type": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/reactions/aggregates": {
      "get": {
        "summary": "Get reaction aggregates",
        "description": "Get aggregated reaction counts for a post or comment.",
        "operationId": "get_blog_reaction_aggregates",
        "tags": [
          "Blog"
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "contentType",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "post",
                "comment"
              ]
            }
          },
          {
            "name": "objectId",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogReactionAggregate"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/taxonomy/categories": {
      "get": {
        "summary": "List blog categories",
        "description": "Retrieve all blog categories for a gaming center.",
        "operationId": "list_blog_categories",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 10
            }
          },
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "isActive",
            "in": "query",
            "required": false,
            "schema": {
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogCategory"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create blog category",
        "description": "Create a new blog category. Requires ADMIN or MANAGER role.",
        "operationId": "create_blog_category",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "slug"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "parentId": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  },
                  "order": {
                    "type": "integer",
                    "default": 0
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Category created",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogCategory"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/taxonomy/categories/{id}": {
      "get": {
        "summary": "Get blog category by ID",
        "description": "Get details of a blog category.",
        "operationId": "get_blog_category_by_id",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogCategory"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "patch": {
        "summary": "Update blog category",
        "description": "Update a category. Requires ADMIN or MANAGER role.",
        "operationId": "update_blog_category",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "parentId": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  },
                  "order": {
                    "type": "integer"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogCategory"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete blog category",
        "description": "Delete a category. Requires ADMIN or MANAGER role.",
        "operationId": "delete_blog_category",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Category deleted",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "message": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/taxonomy/tags": {
      "get": {
        "summary": "List blog tags",
        "description": "Retrieve all blog tags for a gaming center.",
        "operationId": "list_blog_tags",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 10
            }
          },
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "isActive",
            "in": "query",
            "required": false,
            "schema": {
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogTag"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create blog tag",
        "description": "Create a new blog tag. Requires ADMIN or MANAGER role.",
        "operationId": "create_blog_tag",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "slug"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "description": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Tag created",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogTag"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/taxonomy/tags/{id}": {
      "get": {
        "summary": "Get blog tag by ID",
        "description": "Get details of a blog tag.",
        "operationId": "get_blog_tag_by_id",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogTag"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "patch": {
        "summary": "Update blog tag",
        "description": "Update a tag. Requires ADMIN or MANAGER role.",
        "operationId": "update_blog_tag",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "slug": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$"
                  },
                  "description": {
                    "type": "string"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogTag"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete blog tag",
        "description": "Delete a tag. Requires ADMIN or MANAGER role.",
        "operationId": "delete_blog_tag",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Tag deleted",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "message": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/navigation/tree/{location}": {
      "get": {
        "summary": "Get navigation menu tree by location",
        "description": "Retrieve navigation menu tree for a location (HEADER, FOOTER, SIDEBAR,\nMOBILE_DRAWER).",
        "operationId": "get_navigation_tree",
        "tags": [
          "Blog"
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "location",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "HEADER",
                "FOOTER",
                "SIDEBAR",
                "MOBILE_DRAWER"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogMenuItem"
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/navigation/menus": {
      "post": {
        "summary": "Create navigation menu",
        "description": "Create a new navigation menu. Requires ADMIN or MANAGER role.",
        "operationId": "create_navigation_menu",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "location"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "location": {
                    "type": "string",
                    "enum": [
                      "HEADER",
                      "FOOTER",
                      "SIDEBAR",
                      "MOBILE_DRAWER"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Menu created",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogMenu"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/navigation/items": {
      "post": {
        "summary": "Add navigation menu item",
        "description": "Add a link item to an existing menu. Requires ADMIN or MANAGER\nrole.",
        "operationId": "add_navigation_menu_item",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "menuId",
                  "label",
                  "url"
                ],
                "properties": {
                  "menuId": {
                    "type": "string"
                  },
                  "parentId": {
                    "type": "string",
                    "nullable": true
                  },
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 255
                  },
                  "url": {
                    "type": "string",
                    "minLength": 1
                  },
                  "order": {
                    "type": "integer",
                    "minimum": 0
                  },
                  "targetBlank": {
                    "type": "boolean"
                  },
                  "targetType": {
                    "type": "string",
                    "enum": [
                      "CUSTOM",
                      "POST",
                      "CATEGORY",
                      "TAG",
                      "SERIES",
                      "PAGE",
                      "EXTERNAL"
                    ]
                  },
                  "targetId": {
                    "type": "string",
                    "nullable": true
                  },
                  "visibility": {
                    "type": "string",
                    "enum": [
                      "EVERYONE",
                      "GUESTS_ONLY",
                      "LOGGED_IN_ONLY",
                      "MEMBERS_ONLY"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Menu item added",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogMenuItem"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/gamingCenters/{gamingCenterId}/blog/navigation/items/{id}": {
      "patch": {
        "summary": "Update navigation menu item",
        "description": "Update menu item. Requires ADMIN or MANAGER role.",
        "operationId": "update_navigation_menu_item",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "menuId"
                ],
                "properties": {
                  "menuId": {
                    "type": "string"
                  },
                  "parentId": {
                    "type": "string",
                    "nullable": true
                  },
                  "label": {
                    "type": "string"
                  },
                  "url": {
                    "type": "string"
                  },
                  "order": {
                    "type": "integer",
                    "minimum": 0
                  },
                  "targetBlank": {
                    "type": "boolean"
                  },
                  "isActive": {
                    "type": "boolean"
                  },
                  "targetType": {
                    "type": "string",
                    "enum": [
                      "CUSTOM",
                      "POST",
                      "CATEGORY",
                      "TAG",
                      "SERIES",
                      "PAGE",
                      "EXTERNAL"
                    ]
                  },
                  "targetId": {
                    "type": "string",
                    "nullable": true
                  },
                  "visibility": {
                    "type": "string",
                    "enum": [
                      "EVERYONE",
                      "GUESTS_ONLY",
                      "LOGGED_IN_ONLY",
                      "MEMBERS_ONLY"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogMenuItem"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete navigation menu item",
        "description": "Delete menu item. Requires ADMIN or MANAGER role.",
        "operationId": "delete_navigation_menu_item",
        "tags": [
          "Blog"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "gamingCenterId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Menu item deleted",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "message": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/posts": {
      "get": {
        "summary": "Public list published blog posts",
        "description": "Public endpoint to retrieve published blog posts for a gaming center\nby slug.",
        "operationId": "public_get_blog_posts",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 10
            }
          },
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "categoryId",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogPost"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/posts/{id}": {
      "get": {
        "summary": "Public get published blog post by ID",
        "description": "Public endpoint to retrieve a published blog post by ID or slug.",
        "operationId": "public_get_blog_post_by_id",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogPost"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/series": {
      "get": {
        "summary": "Public list blog series",
        "description": "Public endpoint to list blog post series for a gaming center by\nslug.",
        "operationId": "public_get_blog_series",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogSeries"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/series/{id}": {
      "get": {
        "summary": "Public get blog series by ID",
        "description": "Public endpoint to retrieve a blog series by ID.",
        "operationId": "public_get_blog_series_by_id",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogSeries"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/comments/tree": {
      "get": {
        "summary": "Public get comment tree for post",
        "description": "Public endpoint to retrieve comment tree for a blog post.",
        "operationId": "public_get_blog_comment_tree",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "postId",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogComment"
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/reactions/aggregates": {
      "get": {
        "summary": "Public get reaction aggregates",
        "description": "Public endpoint to get reaction counts for a post or comment.",
        "operationId": "public_get_blog_reaction_aggregates",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "contentType",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "post",
                "comment"
              ]
            }
          },
          {
            "name": "objectId",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogReactionAggregate"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/navigation/tree/{location}": {
      "get": {
        "summary": "Public get navigation tree",
        "description": "Public endpoint to retrieve navigation tree by location.",
        "operationId": "public_get_navigation_tree",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "location",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "HEADER",
                "FOOTER",
                "SIDEBAR",
                "MOBILE_DRAWER"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogMenuItem"
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/categories": {
      "get": {
        "summary": "Public list blog categories",
        "description": "Public endpoint to list categories.",
        "operationId": "public_list_blog_categories",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogCategory"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/categories/{id}": {
      "get": {
        "summary": "Public get category by ID",
        "description": "Public endpoint to retrieve category details.",
        "operationId": "public_get_blog_category_by_id",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogCategory"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/tags": {
      "get": {
        "summary": "Public list blog tags",
        "description": "Public endpoint to list tags.",
        "operationId": "public_list_blog_tags",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/BlogTag"
                          }
                        },
                        "meta": {
                          "$ref": "#/components/schemas/Meta"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/public/gamingCenters/{gamingCenterSlug}/blog/tags/{id}": {
      "get": {
        "summary": "Public get tag by ID",
        "description": "Public endpoint to retrieve tag details.",
        "operationId": "public_get_blog_tag_by_id",
        "tags": [
          "Blog",
          "Public"
        ],
        "parameters": [
          {
            "name": "gamingCenterSlug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/Success"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "$ref": "#/components/schemas/BlogTag"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  "tags": [
    {
      "name": "Admin",
      "description": "Administrative endpoints for system management"
    },
    {
      "name": "Analytics",
      "description": "Analytics and reporting endpoints"
    },
    {
      "name": "Audit",
      "description": "Audit logs and system trail"
    },
    {
      "name": "Auth",
      "description": "User and Customer authentication endpoints"
    },
    {
      "name": "Availability",
      "description": "Public availability and slot reservation endpoints"
    },
    {
      "name": "CMS",
      "description": "Content management system operations"
    },
    {
      "name": "Commissions",
      "description": "Commission calculation and earnings"
    },
    {
      "name": "Customer Panel",
      "description": "Customer self-service portal operations"
    },
    {
      "name": "Customers",
      "description": "Customer profile management"
    },
    {
      "name": "Discounts",
      "description": "Discount codes and promotional offers"
    },
    {
      "name": "GamingCenters",
      "description": "Gaming center organization management"
    },
    {
      "name": "GamingSessions",
      "description": "Active station and seat gaming sessions"
    },
    {
      "name": "Notifications",
      "description": "User and customer notifications"
    },
    {
      "name": "Payments",
      "description": "Payment initialization and transaction management"
    },
    {
      "name": "Public",
      "description": "Publicly accessible tenant resources"
    },
    {
      "name": "Ratings",
      "description": "Gaming center reviews and ratings"
    },
    {
      "name": "Reservation",
      "description": "Station booking and reservation management"
    },
    {
      "name": "Settings",
      "description": "Gaming center operational settings"
    },
    {
      "name": "Staff",
      "description": "Staff account and shift management"
    },
    {
      "name": "Stations",
      "description": "Gaming station hardware and availability"
    },
    {
      "name": "Support",
      "description": "Support ticket agent endpoints"
    },
    {
      "name": "System",
      "description": "System operations"
    },
    {
      "name": "Tickets",
      "description": "Customer support ticket management"
    },
    {
      "name": "Waitlist",
      "description": "Reservation waitlist and offer management"
    },
    {
      "name": "Blog",
      "description": "Blog posts, series, comments, reactions, taxonomy, and navigation management"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": [],
      "bearerAuth": []
    },
    {
      "ApiKeyAuth": []
    }
  ]
}