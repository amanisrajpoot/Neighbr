# Neighbr

A gated-community management platform built as a modular monolith.

## Quick Start
- **Full spec:** Read the `neighbr-context` skill
- **Rules:** See `.agents/rules/neighbr.md`

## Stack
| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy 2.x, PostgreSQL, Redis |
| Mobile | React Native, Expo, TypeScript |
| Admin Web | Next.js, TypeScript, Tailwind CSS |
| Offline | SQLite on mobile |
| Storage | S3-compatible |

## Repo Structure (Target)
```
apps/
  mobile/          # React Native + Expo
  admin/           # Next.js admin panel
backend/           # FastAPI modular monolith
packages/          # Shared: api-types, validation, shared-config
```
