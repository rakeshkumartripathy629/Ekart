# ShopKart Microservices — Production Ready

## Architecture

```
Client → API Gateway (3000)
             ├── auth-service        (3001) — JWT, Users, Addresses
             ├── product-service     (3002) — Products, Categories, Inventory
             ├── cart-service        (3003) — Cart, Wishlist, Coupons
             ├── order-service       (3004) — Orders, Tracking
             ├── payment-service     (3005) — Payments, Refunds
             ├── notification-service(3006) — In-app Notifications, Support, Emails
             └── admin-service       (3007) — Dashboard, Analytics, Banners, Settings
```

## Message Brokers

### Kafka (High-throughput ordered events)
| Topic | Publisher | Consumers |
|-------|-----------|-----------|
| order.placed | order-service | cart-service, product-service, payment-service, notification-service |
| order.cancelled | order-service | product-service, payment-service, notification-service |
| order.returned | order-service | product-service, notification-service |
| order.status_updated | order-service | notification-service |
| payment.confirmed | payment-service | order-service, notification-service |
| payment.failed | payment-service | order-service, notification-service |
| payment.refunded | payment-service | notification-service |
| user.registered | auth-service | notification-service |
| user.password_reset | auth-service | notification-service |
| inventory.low_stock | product-service | notification-service |

### RabbitMQ (Retryable task queues with DLQ)
| Queue | Publisher | Worker |
|-------|-----------|--------|
| email.welcome | auth-service | notification-service |
| email.order_confirm | order-service | notification-service |
| email.order_cancel | order-service | notification-service |
| email.order_status | order-service | notification-service |
| email.password_reset | auth-service | notification-service |
| email.refund | payment-service | notification-service |
| payment.process | order-service | payment-service |
| payment.webhook | gateway | payment-service |
| inventory.deduct | order-service | product-service |

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env  # in each service folder

# 2. Start all infrastructure + services
docker-compose up --build

# 3. Seed data
docker exec shopkart-auth node src/seed/index.js
docker exec shopkart-product node src/seed/index.js

# 4. Open dashboards
# API Gateway:    http://localhost:3000/health
# Kafka UI:       http://localhost:8080
# RabbitMQ UI:    http://localhost:15672  (shopkart/shopkart123)
```

## Service Ports
| Service | Port |
|---------|------|
| API Gateway | 3000 |
| Auth | 3001 |
| Product | 3002 |
| Cart | 3003 |
| Order | 3004 |
| Payment | 3005 |
| Notification | 3006 |
| Admin | 3007 |
| Kafka UI | 8080 |
| RabbitMQ UI | 15672 |
| MongoDB | 27017 |
| Redis | 6379 |

## Key Design Decisions
- **Gateway verifies JWT once** — downstream services trust X-User-Id header
- **Each service has its own MongoDB database** — no shared DB
- **Kafka** for high-throughput ordered events (order lifecycle)
- **RabbitMQ** for retryable jobs (emails, payment gateway calls) with Dead Letter Queue
- **No direct cross-service DB access** — only HTTP or message broker
- **Graceful degradation** — cart update still works if product-service is slow
