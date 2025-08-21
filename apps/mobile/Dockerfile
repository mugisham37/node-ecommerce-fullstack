# Dockerfile for React Native mobile development environment
FROM node:18-alpine AS base

# Install system dependencies for React Native
RUN apk add --no-cache \
    bash \
    git \
    python3 \
    make \
    g++ \
    openjdk11-jre-headless \
    android-tools

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/validation/package.json ./packages/validation/
COPY packages/config/package.json ./packages/config/
COPY packages/constants/package.json ./packages/constants/

RUN npm ci

# Development image for React Native
FROM base AS development
WORKDIR /app

# Set environment variables for Android development
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose Metro bundler port
EXPOSE 8081

# Expose development server port
EXPOSE 3000

CMD ["npm", "run", "start:mobile"]