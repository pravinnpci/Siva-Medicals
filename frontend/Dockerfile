FROM nginx:alpine

# Copy all frontend files to Nginx's public directory
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]