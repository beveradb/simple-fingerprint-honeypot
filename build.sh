#!/bin/bash
docker run -it --rm -v`pwd`:/app --entrypoint /bin/sh node:16 -c 'cd /app; yarn install; yarn build'
cd frontend
docker build -t beveradb/simple-fingerprint-honeypot-frontend .
cd ../backend
docker build -t beveradb/simple-fingerprint-honeypot-backend .
cd ..
