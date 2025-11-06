# Stage 1: Build the Angular application
# Use a Node.js base image. Alpine versions are lightweight.
FROM node:18-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install project dependencies
# Using 'npm ci' is often preferred in CI/build environments as it installs exact versions from package-lock.json
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Run the Angular build script (usually 'npm run build')
# This will create the production build in the /app/dist/<project-name> directory
# ----> IMPORTANT: Replace 'my-app' with your actual project name if it's different.
# You can find your project name in the angular.json file.
RUN npm run build -- --configuration production

# Stage 2: Serve the application using NGINX
# Use a lightweight NGINX base image
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove the default NGINX welcome page
RUN rm -rf ./*

# Copy the built application files from the 'build' stage
# ----> IMPORTANT: Replace 'my-app' with your actual project name
COPY --from=build /app/dist/my-app/browser/ .

# Copy the NGINX configuration file (optional, but good for routing)
# We'll need to create an nginx.conf file for this.
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# If you don't have a custom nginx.conf, you might need one to handle Angular routing.
# For a basic setup, we need to tell NGINX to redirect all 404s to index.html
# We can do this by replacing the default config.
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

# Expose port 80 (the default NGINX port)
EXPOSE 80

# The base NGINX image already has a CMD to start the server,
# so we don't need to add one.