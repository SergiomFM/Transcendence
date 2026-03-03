FROM nginx:1.27-alpine

RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/selfsigned.key \
      -out /etc/nginx/ssl/selfsigned.crt \
      -subj '/CN=localhost' \
      -addext 'subjectAltName=DNS:localhost,DNS:proxy'

COPY nginx.conf /etc/nginx/nginx.conf
