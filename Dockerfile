# Stage 1: Build the Angular application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
# Use --legacy-peer-deps to handle peer dependency conflicts
# Fallback to npm install if package-lock.json is missing or outdated
RUN if [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps --no-audit --no-fund; \
    else \
      npm install --legacy-peer-deps --no-audit --no-fund; \
    fi

# Copy source code
COPY . .

# Build the application for production
RUN npm run build -- --configuration=qa

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

