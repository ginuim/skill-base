FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY src/ ./src/
COPY static/ ./static/

RUN mkdir -p /data
ENV DATA_DIR=/data
ENV DATABASE_PATH=/data/skills.db
ENV PORT=8000
ENV APP_BASE_PATH=/

EXPOSE 8000
CMD ["node", "src/index.js"]
