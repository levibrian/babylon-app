# Stage 1: Build the Angular application
FROM node:20-alpine AS build
WORKDIR /app

# Copy package.json and package-lock.json (if it exists)
COPY package*.json ./

# Use 'npm install' instead of 'npm ci'
# This is more flexible and will work even without a package-lock.json
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run the Angular build
# This command builds your app for production
RUN npm run build -- --configuration production

# Stage 2: Serve the application using NGINX
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Copy the built application files from the 'build' stage
# ----> Path updated: Removed '/browser' as it's the likely cause of the error
COPY --from=build /app/dist/ .

# Add NGINX config to handle Angular's HTML5 routing
RUN echo "server { \
    listen 80; \
    server_name localhost; \
    \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80